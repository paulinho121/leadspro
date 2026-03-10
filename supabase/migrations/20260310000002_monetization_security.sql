-- ========================================================
-- LEADFLOW PRO - MONETIZAÇÃO & TRAVAS DE SEGURANÇA
-- Versão: 6.0 - Proteção de Planos e Créditos
-- ========================================================

-- 1. CORREÇÃO DE TIPO: Ajustar deduct_tenant_credits para BIGINT
CREATE OR REPLACE FUNCTION deduct_tenant_credits(
    p_tenant_id UUID,
    p_amount BIGINT, -- Mudado de INT para BIGINT para evitar overflow e mismatch
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

-- 2. FUNÇÃO DE VALIDAÇÃO DE LIMITES DE PLANO
CREATE OR REPLACE FUNCTION check_tenant_limit(
    p_tenant_id UUID,
    p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_plan TEXT;
    v_count INT;
BEGIN
    -- Obter plano atual
    SELECT plan INTO v_plan FROM tenants WHERE id = p_tenant_id;
    
    -- Se for Enterprise, tudo liberado
    IF v_plan = 'enterprise' THEN
        RETURN TRUE;
    END IF;

    -- Lógica por Feature
    CASE p_feature
        WHEN 'active_sequences' THEN
            SELECT count(*) INTO v_count FROM outreach_sequences WHERE tenant_id = p_tenant_id AND is_active = true;
            IF v_plan = 'free' AND v_count >= 1 THEN RETURN FALSE; END IF;
            IF v_plan = 'pro' AND v_count >= 10 THEN RETURN FALSE; END IF;
        
        WHEN 'concurrent_campaigns' THEN
            SELECT count(*) INTO v_count FROM outreach_campaigns WHERE tenant_id = p_tenant_id AND status = 'running';
            IF v_plan = 'free' AND v_count >= 1 THEN RETURN FALSE; END IF;
            IF v_plan = 'pro' AND v_count >= 5 THEN RETURN FALSE; END IF;

        WHEN 'ai_personalization' THEN
            IF v_plan = 'free' THEN RETURN FALSE; END IF;

        WHEN 'visual_workflow' THEN
            IF v_plan = 'free' THEN RETURN FALSE; END IF;
            
        ELSE
            RETURN TRUE;
    END CASE;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER DE PROTEÇÃO EM RUNTIME (Campanhas)
CREATE OR REPLACE FUNCTION enforce_campaign_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou para 'running', validar limites
    IF NEW.status = 'running' AND (OLD.status IS NULL OR OLD.status != 'running') THEN
        IF NOT check_tenant_limit(NEW.tenant_id, 'concurrent_campaigns') THEN
            RAISE EXCEPTION 'Limite de campanhas simultâneas atingido para o seu plano.';
        END IF;
    END IF;

    -- Se ativou personalização com IA, validar plano
    IF NEW.use_ai_personalization = true THEN
        IF NOT check_tenant_limit(NEW.tenant_id, 'ai_personalization') THEN
            RAISE EXCEPTION 'A Personalização com IA é um recurso dos planos PRO e Enterprise.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_limit_check ON outreach_campaigns;
CREATE TRIGGER trg_campaign_limit_check
    BEFORE INSERT OR UPDATE ON outreach_campaigns
    FOR EACH ROW EXECUTE FUNCTION enforce_campaign_limits();

-- 4. ADICIONAR COLUNA use_ai_personalization se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_campaigns' AND column_name = 'use_ai_personalization') THEN
        ALTER TABLE outreach_campaigns ADD COLUMN use_ai_personalization BOOLEAN DEFAULT false;
    END IF;
END $$;
