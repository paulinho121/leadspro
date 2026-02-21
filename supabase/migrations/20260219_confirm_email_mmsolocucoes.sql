
-- Forçar a confirmação do email para o usuário mmsolocucoes@mail.com
-- Corrigido: Atualizando apenas email_confirmed_at, pois confirmed_at é uma coluna gerada.

UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'mmsolocucoes@mail.com';
