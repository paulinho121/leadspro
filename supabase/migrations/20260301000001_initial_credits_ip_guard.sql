-- =========================================================================
-- LEADFLOW PRO - INITIAL CREDITS & IP GUARD
-- Garante que o bônus de 1000 créditos só seja dado 1x por IP
-- =========================================================================

-- 1. Tabela para rastrear IPs que já resgataram os créditos
CREATE TABLE IF NOT EXISTS public.claimed_ips (
    ip_address TEXT PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Segurança da tabela
ALTER TABLE public.claimed_ips ENABLE ROW LEVEL SECURITY;
-- Sem políticas, para que não possa ser lida/escrita via API pública, apenas por funções SECURITY DEFINER.

-- 2. Adicionar flag na carteira para rastrear o resgate por tenant
ALTER TABLE public.tenant_wallets
ADD COLUMN IF NOT EXISTS initial_credits_claimed BOOLEAN DEFAULT false;

-- 3. Modificar o trigger padrão de criação de carteira para começar com 0 créditos
CREATE OR REPLACE FUNCTION public.handle_new_tenant_wallet() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_wallets (tenant_id, credit_balance, initial_credits_claimed)
    VALUES (NEW.id, 0, false)
    ON CONFLICT (tenant_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função segura RPC para o Client resgatar os 1000 créditos
CREATE OR REPLACE FUNCTION public.claim_initial_credits()
RETURNS JSONB AS $$
DECLARE
    v_ip TEXT;
    v_tenant_id UUID;
    v_claimed_count INT;
    v_wallet_record RECORD;
BEGIN
    -- 4.1 Obter Tenant do usuário logado (presume que profile está criado)
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão inválida: Usuário sem tenant.');
    END IF;

    -- 4.2 Capturar o IP real usando x-forwarded-for do PostgREST
    DECLARE
        v_headers TEXT;
    BEGIN
        v_headers := current_setting('request.headers', true);
        IF v_headers IS NOT NULL AND v_headers != '' THEN
            v_ip := split_part(v_headers::json->>'x-forwarded-for', ',', 1);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;
    
    IF v_ip IS NULL OR v_ip = '' THEN
        v_ip := 'unknown';
    END IF;

    -- 4.3 Se o IP não for unknown, verificar na tabela claimed_ips
    IF v_ip != 'unknown' THEN
        SELECT count(*) INTO v_claimed_count FROM public.claimed_ips WHERE ip_address = v_ip;
        IF v_claimed_count > 0 THEN
            RETURN jsonb_build_object('success', false, 'message', 'Os créditos iniciais já foram resgatados por este dispositivo/IP.');
        END IF;
    END IF;
    
    -- 4.4 Verificar a carteira atual (com FOR UPDATE para evitar race condition dupla)
    SELECT * INTO v_wallet_record FROM public.tenant_wallets WHERE tenant_id = v_tenant_id FOR UPDATE;
    
    -- Se por acaso a carteira não existir, criamos para poder depositar (segurança extra)
    IF v_wallet_record IS NULL THEN
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance, initial_credits_claimed) 
        VALUES (v_tenant_id, 0, false) 
        RETURNING * INTO v_wallet_record;
    END IF;

    -- Verifica se já resgatou
    IF v_wallet_record.initial_credits_claimed = true THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sua organização já resgatou os créditos iniciais.');
    END IF;

    -- 4.5 Efetuar depósito e marcar resgate
    UPDATE public.tenant_wallets
    SET credit_balance = credit_balance + 1000,
        initial_credits_claimed = true,
        updated_at = NOW()
    WHERE tenant_id = v_tenant_id;

    -- 4.6 Registrar o IP para prevenir novos resgates
    IF v_ip != 'unknown' THEN
        INSERT INTO public.claimed_ips (ip_address, tenant_id) VALUES (v_ip, v_tenant_id) ON CONFLICT DO NOTHING;
    END IF;
    
    -- 4.7 Gravar histórico na transação
    INSERT INTO public.credit_transactions (tenant_id, amount, type, description)
    VALUES (v_tenant_id, 1000, 'bonus', 'Bônus inicial de 1000 créditos (Protegido por IP)');

    RETURN jsonb_build_object('success', true, 'message', '1000 créditos liberados na sua conta!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
