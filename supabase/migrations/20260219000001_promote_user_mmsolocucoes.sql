
-- Garantir que o usuário mmsolocucoes@mail.com seja admin (Master Admin)
-- Isso permite visualizar todos os tenants e leads no sistema

UPDATE profiles 
SET is_master_admin = true 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'mmsolocucoes@mail.com'
);

-- Confirmação (opcional, apenas para log se rodar em script capaz de output)
-- DO $$
-- BEGIN
--    IF NOT FOUND THEN
--       RAISE NOTICE 'Usuário mmsolocucoes@mail.com não encontrado na tabela profiles.';
--    END IF;
-- END $$;
