
-- ======================================================
-- MASTER CONSOLE FIX: PERMISSÕES DA TABELA DE TENANTS
-- ======================================================

-- 1. Garantir que as funções auxiliares existam (caso não tenham sido rodadas as migrações anteriores)
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Limpar políticas antigas ou conflitantes na tabela de tenants
DROP POLICY IF EXISTS "Master Admin: Ver todos os tenants" ON tenants;
DROP POLICY IF EXISTS "Master Admin: Gerenciar todos os tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_master_policy" ON tenants;
DROP POLICY IF EXISTS "tenants_isolation_policy" ON tenants;

-- 3. Habilitar RLS (caso não esteja)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- 4. Criar política para Master Admin (Acesso Total)
-- Isso permite que o Master Console liste todas as empresas
CREATE POLICY "tenants_master_all" ON public.tenants
    FOR ALL TO authenticated
    USING (public.check_is_master());

-- 5. Criar política para Usuários Comuns (Ver apenas sua própria empresa)
-- Essencial para que o Branding e outras consultas funcionem pros clientes
CREATE POLICY "tenants_self_read" ON public.tenants
    FOR SELECT TO authenticated
    USING (id = public.get_auth_tenant());

-- 6. Aplicar o mesmo para a tabela de perfis (garantir que o Master veja todos)
DROP POLICY IF EXISTS "profiles_isolation_policy" ON profiles;
CREATE POLICY "profiles_isolation_policy" ON public.profiles
    FOR ALL TO authenticated
    USING (id = auth.uid() OR public.check_is_master());

-- 7. Fix para a tabela tenant_users (Gestão de time)
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_users_isolation_policy" ON tenant_users;
CREATE POLICY "tenant_users_isolation_policy" ON public.tenant_users
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());
