
-- script para forçar permissão master no banco de dados
UPDATE profiles 
SET is_master_admin = true 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'paulofernandoautomacao@gmail.com'
);

-- Caso o perfil não exista (raro, mas possível), o código acima não fará nada.
-- O ideal é rodar isso no SQL Editor do Supabase.
