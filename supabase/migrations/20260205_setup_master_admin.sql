
-- 1. Adicionar campo de Master Admin no Profile (Opcional mas recomendado)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master_admin BOOLEAN DEFAULT false;

-- 2. Atualizar o seu usuário para ser Master Admin (Substitua o e-mail abaixo pelo seu)
-- UPDATE profiles SET is_master_admin = true WHERE id IN (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');

-- 3. Políticas de RLS para o Master Admin ver TODOS os Tenants
DROP POLICY IF EXISTS "Master Admin: Ver todos os tenants" ON tenants;
CREATE POLICY "Master Admin: Ver todos os tenants" ON tenants
    FOR SELECT USING (
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

DROP POLICY IF EXISTS "Master Admin: Gerenciar todos os tenants" ON tenants;
CREATE POLICY "Master Admin: Gerenciar todos os tenants" ON tenants
    FOR ALL USING (
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 4. Permitir que o Master Admin veja todos os Leads de todos os tenants
DROP POLICY IF EXISTS "Master Admin: Ver todos os leads" ON leads;
CREATE POLICY "Master Admin: Ver todos os leads" ON leads
    FOR SELECT USING (
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 5. Permitir que o Master Admin veja todos os usuários cadastrados
DROP POLICY IF EXISTS "Master Admin: Ver todos os perfis" ON profiles;
CREATE POLICY "Master Admin: Ver todos os perfis" ON profiles
    FOR SELECT USING (
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true OR tenant_id = get_auth_tenant()
    );
