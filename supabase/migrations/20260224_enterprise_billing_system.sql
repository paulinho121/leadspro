-- ========================================================
-- LEADFLOW PRO - ENTERPRISE BILLING & CREDIT SYSTEM
-- Versão: 1.0 - Sistema de Wallet e Transações
-- ========================================================

-- 1. TABELA DE WALLETS (Saldos por Tenant)
CREATE TABLE IF NOT EXISTS tenant_wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    credit_balance BIGINT DEFAULT 0, -- Créditos em unidades inteiras (ex: 1000 créditos)
    auto_recharge_enabled BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. HISTÓRICO DE TRANSAÇÕES (Auditoria de Consumo)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- Positivo para carga, Negativo para consumo
    type TEXT NOT NULL, -- 'purchase', 'usage', 'refund', 'bonus'
    service_name TEXT, -- 'gemini', 'serper', 'cnpj_api', 'bulk_import'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FUNÇÃO PARA CONSUMO SEGURO (Prevenir saldo negativo)
CREATE OR REPLACE FUNCTION deduct_tenant_credits(
    p_tenant_id UUID,
    p_amount INT,
    p_service TEXT,
    p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
BEGIN
    -- Bloquear a linha para update
    SELECT credit_balance INTO v_current_balance 
    FROM tenant_wallets 
    WHERE tenant_id = p_tenant_id 
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        -- Inicializar wallet se não existir
        INSERT INTO tenant_wallets (tenant_id, credit_balance) 
        VALUES (p_tenant_id, 0);
        v_current_balance := 0;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN FALSE; -- Saldo insuficiente
    END IF;

    -- Deduzir saldo
    UPDATE tenant_wallets 
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;

    -- Registrar transação
    INSERT INTO credit_transactions (tenant_id, amount, type, service_name, description)
    VALUES (p_tenant_id, -p_amount, 'usage', p_service, p_description);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. SEGURANÇA (RLS)
ALTER TABLE tenant_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wallets: isolation" ON tenant_wallets 
    FOR SELECT USING (tenant_id = get_auth_tenant());

CREATE POLICY "Transactions: isolation" ON credit_transactions 
    FOR SELECT USING (tenant_id = get_auth_tenant());

-- 5. TRIGGER: Criar Wallet automática para novos Tenants
CREATE OR REPLACE FUNCTION public.handle_new_tenant_wallet() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_wallets (tenant_id, credit_balance)
    VALUES (NEW.id, 50); -- Bônus inicial de 50 créditos para novos tenants
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_tenant_created_wallet
    AFTER INSERT ON tenants
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_tenant_wallet();

-- 6. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON credit_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON credit_transactions(created_at);
