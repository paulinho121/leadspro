
-- ======================================================
-- ANTI-RECURSION FIX: RESOLUÇÃO DE LOOP DE POLÍTICAS
-- ======================================================

-- 1. Funções com SECURITY DEFINER (Bypass RLS para evitar loops)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. RESET TOTAL de políticas para Profiles
DROP POLICY IF EXISTS "Profiles: Ver Mesma Empresa" ON profiles;
DROP POLICY IF EXISTS "Profiles: Atualizar Próprio" ON profiles;
DROP POLICY IF EXISTS "Profiles: permitir leitura do próprio no setup" ON profiles;
DROP POLICY IF EXISTS "Master Admin: Ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "perfil_acesso_total" ON profiles;

-- 3. Nova política ultra-simples para Profiles
CREATE POLICY "profiles_isolation_policy" ON public.profiles
    FOR ALL TO authenticated
    USING (id = auth.uid() OR public.check_is_master());

-- 4. RESET e FIX para White Label
DROP POLICY IF EXISTS "White Label: Gerenciar Próprio" ON white_label_configs;
DROP POLICY IF EXISTS "branding_gerenciamento_isolado" ON white_label_configs;

CREATE POLICY "branding_isolation_policy" ON white_label_configs
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());

-- 5. FIX para Leads
DROP POLICY IF EXISTS "Leads: isolamento absoluto" ON leads;
DROP POLICY IF EXISTS "leads_isolamento_total" ON leads;

CREATE POLICY "leads_isolation_policy" ON public.leads
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());
