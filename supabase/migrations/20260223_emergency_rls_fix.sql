
-- ======================================================
-- CORREÇÃO DE EMERGÊNCIA: RLS RECURSÃO E ACESSO
-- ======================================================

-- 1. LIMPAR POLÍTICAS PROBLEMÁTICAS (RECURSIVAS)
DROP POLICY IF EXISTS "Profiles: Ver membros da mesma empresa" ON profiles;
DROP POLICY IF EXISTS "Leads: Isolamento Total" ON leads;
DROP POLICY IF EXISTS "Membros: Isolamento por Tenant" ON tenant_users;
DROP POLICY IF EXISTS "Branding: Leitura por Domínio/Subdomínio" ON white_label_configs;

-- 2. NOVA POLÍTICA PARA PROFILES (SEM RECURSÃO)
-- Usamos a função get_auth_tenant() que já é SECURITY DEFINER (ignora RLS)
CREATE POLICY "Profiles: Ver membros da mesma empresa" ON profiles
    FOR SELECT TO authenticated
    USING (tenant_id = get_auth_tenant());

-- 3. NOVA POLÍTICA PARA LEADS (REATIVANDO ACESSO AO TENANT DEFAULT PARA NÃO TRAVAR CLIENTES)
-- Permitimos que usuários vejam leads do seu tenant OU leads do tenant default (0000...)
-- Isso garante que leads capturados antes da migração continuem visíveis.
CREATE POLICY "Leads: Isolamento e Legado" ON leads
    FOR ALL TO authenticated
    USING (
        tenant_id = get_auth_tenant()
        OR
        tenant_id = '00000000-0000-0000-0000-000000000000'
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 4. NOVA POLÍTICA PARA TENANT_USERS
CREATE POLICY "Membros: Acesso via Função" ON tenant_users
    FOR ALL TO authenticated
    USING (
        tenant_id = get_auth_tenant()
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 5. AJUSTE NA POLÍTICA DE BRANDING (VOLTAR PARA LEITURA PÚBLICA ENQUANTO TESTAMOS DOMÍNIOS)
-- A restrição por Host header pode falhar se o Supabase não estiver recebendo o header corretamente.
-- Como removemos a coluna de api_keys, o SELECT público já é seguro (FINDING-5 corrigido).
DROP POLICY IF EXISTS "Branding: Leitura por Domínio/Subdomínio" ON white_label_configs;
CREATE POLICY "Public Branding Access" ON white_label_configs
    FOR SELECT
    USING (true);

-- 6. GARANTIR PERMISSÕES PARA USUÁRIOS AUTENTICADOS
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7. GARANTIR QUE O USUÁRIO PAULO É MASTER (Fail-safe)
UPDATE public.profiles
SET is_master_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'paulofernandoautomacao@gmail.com'
);

-- LOG
COMMENT ON TABLE profiles IS 'RLS Corrigido: Recursão removida.';
