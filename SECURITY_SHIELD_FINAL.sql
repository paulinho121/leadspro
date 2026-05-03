-- =========================================================================
-- 🛡️ SECURITY SHIELD FINAL - REFORÇO DE SEGURANÇA E ISOLAMENTO (HARDENED)
-- Versão: 12.0 (Resilient Column Detection)
-- Descrição: Este script aplica isolamento multi-tenant de forma resiliente,
-- verificando a existência da coluna tenant_id antes de criar as políticas.
-- =========================================================================

-- GARANTIR QUE O SCHEMA PUBLIC ESTEJA NO PATH
SET search_path = public, pg_catalog;

-- 1. FUNÇÃO DE HELPER PARA IDENTIDADE SEGURA
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNÇÃO DE HELPER PARA CHECAR MASTER ADMIN
CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((SELECT is_master_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. GATILHO DE PROTEÇÃO NUCLEAR (PREVENÇÃO DE INJEÇÃO DE TENANT_ID)
CREATE OR REPLACE FUNCTION public.enforce_tenant_integrity()
RETURNS TRIGGER AS $$
DECLARE
    user_tenant UUID;
BEGIN
    -- Se for Master Admin, permite tudo (manutenção)
    IF public.is_master_admin() THEN
        RETURN NEW;
    END IF;

    user_tenant := public.get_auth_tenant();

    -- Se o tenant_id não foi fornecido no NEW, injeta o correto automaticamente
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := user_tenant;
    END IF;

    -- Se o tenant_id fornecido for diferente do tenant do usuário, bloqueia
    IF NEW.tenant_id <> user_tenant THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Tentativa de acesso a tenant não autorizado detectada.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. APLICAÇÃO DE RLS HARDENED EM TODAS AS TABELAS CRÍTICAS

DO $$
DECLARE
    t TEXT;
    tables TEXT[] := ARRAY[
        'leads', 'profiles', 'white_label_configs', 'api_usage_logs', 
        'tenant_users', 'tenant_wallets', 'credit_transactions', 
        'activity_logs', 'notifications', 'support_tickets', 
        'ticket_messages', 'webhooks', 'deals', 'campaigns', 
        'outreach_campaigns', 'message_queue', 'automation_rules', 
        'visual_workflows', 'background_tasks', 'ai_sdr_interactions', 
        'outreach_sequences', 'sequence_enrollments', 'tenant_api_keys'
    ];
BEGIN
    FOR t IN SELECT unnest(tables) LOOP
        -- Verificar se a tabela existe antes de aplicar
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t) THEN
            -- Habilitar RLS
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            
            -- Remover políticas conflitantes (Limpamos sempre para evitar lixo)
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_select" ON public.%I', t);
            EXECUTE format('DROP POLICY IF EXISTS "tenant_isolation_all" ON public.%I', t);
            
            -- SÓ CRIA POLÍTICAS GENÉRICAS SE A COLUNA tenant_id EXISTIR
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
                
                -- Criar Política Mestra de Isolamento (SELECT)
                EXECUTE format('
                    CREATE POLICY "tenant_isolation_select" ON public.%I
                    FOR SELECT TO authenticated
                    USING (
                        tenant_id = public.get_auth_tenant() OR public.is_master_admin()
                    )', t);

                -- Criar Política Mestra de Modificação (ALL)
                EXECUTE format('
                    CREATE POLICY "tenant_isolation_all" ON public.%I
                    FOR ALL TO authenticated
                    USING (
                        tenant_id = public.get_auth_tenant() OR public.is_master_admin()
                    )
                    WITH CHECK (
                        tenant_id = public.get_auth_tenant() OR public.is_master_admin()
                    )', t);

                -- Aplicar Gatilho de Integridade Nuclear
                EXECUTE format('DROP TRIGGER IF EXISTS trg_enforce_tenant_%I ON public.%I', t, t);
                EXECUTE format('
                    CREATE TRIGGER trg_enforce_tenant_%I
                    BEFORE INSERT OR UPDATE ON public.%I
                    FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_integrity()', t, t);
            END IF;
        END IF;
    END LOOP;
END $$;

-- 5. REGRAS ESPECIAIS PARA WHITE LABEL CONFIGS
DROP POLICY IF EXISTS "Branding: leitura pública" ON white_label_configs;
CREATE POLICY "Branding: leitura pública" ON white_label_configs
    FOR SELECT TO anon, authenticated
    USING (true);

-- 6. PROTEÇÃO DE API KEYS (Permissões de Coluna)
REVOKE ALL ON public.tenant_api_keys FROM anon;
REVOKE ALL ON public.white_label_configs FROM anon;
GRANT SELECT (id, tenant_id, platform_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, background_color, sidebar_color) 
ON public.white_label_configs TO anon;

-- 7. NOTIFICAÇÃO DE RELOAD
NOTIFY pgrst, 'reload schema';
