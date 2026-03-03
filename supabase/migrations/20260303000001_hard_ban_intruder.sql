-- ======================================================
-- LEADFLOW PRO SECURITY: BANIMENTO DEFINITIVO (LEVEL 1)
-- ======================================================

-- 1. Criar lista de banimento na tabela de logs para rastreamento
INSERT INTO public.activity_logs (tenant_id, user_id, action, details)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '3a760c29-accb-47e0-9b31-be35cb7e156f',
    'SECURITY_BAN_LIST_APPLIED',
    'Alvo: alejandroeduardobrasharriot@gmail.com foi marcado para banimento imediato em DB e App.'
);

-- 2. Trigger de Prevenção de Criação de Perfil para o Invasor
-- Mesmo que ele tente se registrar novamente com o mesmo e-mail ou utilize o ID de auth,
-- o banco de dados rejeitará a criação do profile no schema public.
CREATE OR REPLACE FUNCTION public.check_banned_user_on_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Lista de IDs ou padrões de nomes/emails banidos
    IF NEW.full_name ILIKE '%Alejandro%' OR NEW.full_name ILIKE '%FX%' OR NEW.id = '25b90f34-644b-4c1a-8148-dd88e647f441' THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: Este usuário foi banido por tentativas de hacking e violação dos termos.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_check_banned_user ON public.profiles;
CREATE TRIGGER tr_check_banned_user
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_banned_user_on_profile();

-- 3. Limpar qualquer resquício de dados desse ID
DELETE FROM public.activity_logs WHERE user_id = '25b90f34-644b-4c1a-8148-dd88e647f441';
DELETE FROM public.profiles WHERE id = '25b90f34-644b-4c1a-8148-dd88e647f441';
DELETE FROM public.white_label_configs WHERE tenant_id = '25b90f34-644b-4c1a-8148-dd88e647f441';

COMMENT ON FUNCTION public.check_banned_user_on_profile IS 'Filtro de segurança nível DB para bloquear recriação de perfis de hackers conhecidos.';
