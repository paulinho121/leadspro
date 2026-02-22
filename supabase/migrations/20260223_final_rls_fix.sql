
-- ======================================================
-- FIX FINAL: RLS SEM RECURSÃO E RECUPERAÇÃO DE LEADS
-- ======================================================

-- 1. FUNÇÕES AUXILIARES (SECURITY DEFINER para ignorar RLS)
-- Isso evita o erro de "infinite recursion"
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_master()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. RESET DE POLÍTICAS (PROFILES)
DROP POLICY IF EXISTS "Profiles: Ver próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Profiles: Ver membros da mesma empresa" ON profiles;
DROP POLICY IF EXISTS "Profiles: Master vê todos" ON profiles;
DROP POLICY IF EXISTS "Profiles: Atualizar próprio perfil" ON profiles;
DROP POLICY IF EXISTS "Profiles: Self Select" ON profiles;
DROP POLICY IF EXISTS "Profiles: Tenant Select" ON profiles;
DROP POLICY IF EXISTS "Profiles: Master Select" ON profiles;
DROP POLICY IF EXISTS "Profiles: Ver Próprio" ON profiles;
DROP POLICY IF EXISTS "Profiles: Ver Empresa" ON profiles;

-- 3. NOVAS POLÍTICAS PROFILES (SIMPLES E SEGURAS)
-- Permite ler o próprio perfil (Essencial para o app carregar)
CREATE POLICY "Profiles: Autoconsulta" 
ON profiles FOR SELECT TO authenticated 
USING (id = auth.uid());

-- Permite ler colegas da mesma empresa (Usa função helper para evitar loop)
CREATE POLICY "Profiles: Membros da Empresa" 
ON profiles FOR SELECT TO authenticated 
USING (tenant_id = get_auth_tenant());

-- Master Admin vê tudo
CREATE POLICY "Profiles: Master Global" 
ON profiles FOR SELECT TO authenticated 
USING (is_master());

-- Atualização pessoal
CREATE POLICY "Profiles: Update Own" 
ON profiles FOR UPDATE TO authenticated 
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- 4. RESET E CORREÇÃO DE LEADS
DROP POLICY IF EXISTS "Leads: Isolamento Total" ON leads;
DROP POLICY IF EXISTS "Leads: Isolamento e Legado" ON leads;
DROP POLICY IF EXISTS "Leads: Multi-Tenant" ON leads;

CREATE POLICY "Leads: Acesso por Tenant" 
ON leads FOR ALL TO authenticated 
USING (
    tenant_id = get_auth_tenant() 
    OR 
    tenant_id = '00000000-0000-0000-0000-000000000000' -- Garante acesso aos leads "soltos" do dev
    OR 
    is_master()
);

-- 5. CORREÇÃO DE BRANDING (RESET)
DROP POLICY IF EXISTS "Branding: Leitura por Domínio/Subdomínio" ON white_label_configs;
DROP POLICY IF EXISTS "Public Branding Access" ON white_label_configs;
CREATE POLICY "Public Branding Access" ON white_label_configs FOR SELECT USING (true);

-- 6. GARANTIR QUE PAULO É MASTER (REFORÇO)
UPDATE public.profiles
SET is_master_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'paulofernandoautomacao@gmail.com'
);

-- LOG
COMMENT ON TABLE leads IS 'RLS Corrigido: Leads legados e atuais visíveis.';
