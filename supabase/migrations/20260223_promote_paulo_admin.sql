
-- ======================================================
-- PROMOÇÃO DE MASTER ADMIN (EXECUTAR NO SQL EDITOR)
-- ======================================================

-- Define o usuário 'paulofernandoautomacao@gmail.com' como Master Admin
-- Agora que removemos o backdoor do código, esta é a única forma legítima de acesso.

UPDATE public.profiles
SET is_master_admin = true
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'paulofernandoautomacao@gmail.com'
);

-- Log de confirmação
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM profiles p 
        JOIN auth.users u ON p.id = u.id 
        WHERE u.email = 'paulofernandoautomacao@gmail.com' AND p.is_master_admin = true
    ) THEN
        RAISE NOTICE 'Sucesso: Paulo Fernando agora é Master Admin via Banco de Dados.';
    ELSE
        RAISE NOTICE 'Erro: Usuário não encontrado ou não pôde ser promovido. Verifique se o e-mail está correto.';
    END IF;
END $$;
