
-- ======================================================
-- REPARO DE IDENTIDADE: PAULO FERNANDO
-- ======================================================

-- 1. Garante que o perfil existe e está correto
INSERT INTO public.profiles (id, tenant_id, full_name, role, is_master_admin)
SELECT 
    id, 
    '00000000-0000-0000-0000-000000000000', 
    'Paulo Fernando', 
    'admin', 
    true
FROM auth.users 
WHERE email = 'paulofernandoautomacao@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    full_name = 'Paulo Fernando',
    is_master_admin = true,
    tenant_id = '00000000-0000-0000-0000-000000000000';

-- 2. Garante que o metadados do Auth também tem o nome
UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data || '{"full_name": "Paulo Fernando"}'::jsonb
WHERE email = 'paulofernandoautomacao@gmail.com';

-- 3. Limpa qualquer cache de sessão (opcional, o usuário precisará deslogar e logar)
-- NOTA: Como você está logado, talvez precise dar um "Encerrar Conexão" no app e entrar de novo para que o nome carregue.

-- LOG
COMMENT ON TABLE profiles IS 'Perfil de Paulo Fernando restaurado com nome e Master Admin.';
