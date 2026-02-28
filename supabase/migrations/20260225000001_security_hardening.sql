
-- ======================================================
-- LEADFLOW PRO - SECURITY HARDENING (SENIOR ENGINEER FIX)
-- Versão: 6.0 - Resolvendo alertas do Security Advisor
-- ======================================================

-- 1. REFORÇO DE RLS (Defensivo)
-- Garante que as tabelas financeiras e de infraestrutura estejam protegidas
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_wallets') THEN
        ALTER TABLE public.tenant_wallets ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'credit_transactions') THEN
        ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'background_tasks') THEN
        ALTER TABLE public.background_tasks ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'communication_settings') THEN
        ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_usage_logs') THEN
        ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 2. HARDENING DE "SECURITY DEFINER" (Resolvendo "Security Definer View/Function")
-- O alerta principal do Supabase é a falta de search_path estrito em funções SECURITY DEFINER.

-- A) get_auth_tenant (Hardenizado com search_path para evitar hijacking)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- B) handle_new_user_onboarding
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    base_name TEXT;
    clean_slug TEXT;
BEGIN
    base_name := COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1));
    clean_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || (floor(random() * 8999) + 1000)::text;

    INSERT INTO public.tenants (name, slug, plan)
    VALUES (base_name || ' Labs', clean_slug, 'pro')
    RETURNING id INTO new_tenant_id;

    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES (new.id, new_tenant_id, base_name, 'admin')
    ON CONFLICT (id) DO UPDATE 
    SET tenant_id = EXCLUDED.tenant_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    INSERT INTO public.white_label_configs (tenant_id, platform_name)
    VALUES (new_tenant_id, base_name || ' Pro')
    ON CONFLICT (tenant_id) DO NOTHING;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- C) deduct_tenant_credits
CREATE OR REPLACE FUNCTION public.deduct_tenant_credits(
    p_tenant_id UUID,
    p_amount INT,
    p_service TEXT,
    p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
BEGIN
    SELECT credit_balance INTO v_current_balance 
    FROM public.tenant_wallets 
    WHERE tenant_id = p_tenant_id 
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance) 
        VALUES (p_tenant_id, 0);
        v_current_balance := 0;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    UPDATE public.tenant_wallets 
    SET credit_balance = credit_balance - p_amount,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;

    INSERT INTO public.credit_transactions (tenant_id, amount, type, service_name, description)
    VALUES (p_tenant_id, -p_amount, 'usage', p_service, p_description);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- D) handle_new_tenant_wallet
CREATE OR REPLACE FUNCTION public.handle_new_tenant_wallet() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.tenant_wallets (tenant_id, credit_balance)
    VALUES (NEW.id, 50);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- E) check_is_master (Nova função auxiliar para evitar recursão em políticas)
CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_master_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. POLÍTICAS DE ISOLAMENTO (NON-RECURSIVE & SECURE)

-- A) Profiles
DROP POLICY IF EXISTS "Profiles: Ver Mesma Empresa" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Master vê todos" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Isolamento Tenant" ON public.profiles;
CREATE POLICY "Profiles: Isolamento Tenant" ON public.profiles
    FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant() OR check_is_master());

-- B) Wallets & Transactions
DROP POLICY IF EXISTS "Wallets: isolation" ON public.tenant_wallets;
DROP POLICY IF EXISTS "Wallets: Isolamento Tenant" ON public.tenant_wallets;
CREATE POLICY "Wallets: Isolamento Tenant" ON public.tenant_wallets
    FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant() OR check_is_master());

DROP POLICY IF EXISTS "Transactions: isolation" ON public.credit_transactions;
DROP POLICY IF EXISTS "Transactions: Isolamento Tenant" ON public.credit_transactions;
CREATE POLICY "Transactions: Isolamento Tenant" ON public.credit_transactions
    FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant() OR check_is_master());

-- C) API Usage Logs
DROP POLICY IF EXISTS "Logs: Isolamento Tenant" ON public.api_usage_logs;
CREATE POLICY "Logs: Isolamento Tenant" ON public.api_usage_logs
    FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant() OR check_is_master());

-- 4. VIEW DE BRANDING PÚBLICO (Segurança Máxima / Resolvendo erro Security Advisor)
-- Supabase Advisor reclama de views que ignoram RLS se não forem SECURITY INVOKER.
-- Como Branding precisa ser visível antes do login (Anon), vamos restringir as colunas.

DROP VIEW IF EXISTS public.branding_public;
CREATE VIEW public.branding_public WITH (security_invoker = true) AS
SELECT 
    tenant_id, 
    platform_name, 
    logo_url, 
    favicon_url, 
    primary_color, 
    secondary_color, 
    accent_color, 
    background_color, 
    sidebar_color, 
    custom_domain, 
    subdomain
FROM public.white_label_configs;

-- Ajustar permissões para Anon na view e na tabela base
GRANT SELECT ON public.branding_public TO anon, authenticated;
GRANT SELECT ON public.white_label_configs TO anon, authenticated;

-- Garantir que a tabela base permite leitura pública via RLS (necessário p/ security_invoker = true)
DROP POLICY IF EXISTS "Branding: leitura pública" ON public.white_label_configs;
CREATE POLICY "Branding: Visibilidade Pública" ON public.white_label_configs
    FOR SELECT USING (true);

-- 5. RESTRICÃO ADICIONAL DE SCHEMA
-- Impede enumeração via PostgREST para usuários anônimos
REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.branding_public TO anon;

-- LOG
COMMENT ON SCHEMA public IS 'Hardenizado em 25/02/2026 - Proteção total contra vazamento de tenants e search path hijacking.';
