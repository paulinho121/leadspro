-- ======================================================
-- LEADFLOW PRO SECURITY: A REGRA DO HIGHLANDER (SÓ PODE HAVER UM MASTER)
-- ======================================================

-- 1. Remover privilégios de qualquer outro usuário (Exceto Paulo Fernando)
UPDATE public.profiles 
SET is_master_admin = false 
WHERE id <> '3a760c29-accb-47e0-9b31-be35cb7e156f';

-- 2. CRIAR REGRA INQUEBRÁVEL (Índice Único Parcial)
-- Isso impede fisicamente que o banco de dados aceite mais de um TRUE na coluna is_master_admin
DROP INDEX IF EXISTS idx_single_master_admin;
CREATE UNIQUE INDEX idx_single_master_admin ON public.profiles (is_master_admin) 
WHERE (is_master_admin = true);

-- 3. REFORÇO VIA TRIGGER (Hard-Pinning)
-- Garante que nem por erro de sistema o Master mude de ID sem intervenção direta no DB.
CREATE OR REPLACE FUNCTION public.enforce_single_master_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Bloquear a criação/promoção de qualquer master que não seja o ID original do Paulo
    IF NEW.is_master_admin = true AND NEW.id <> '3a760c29-accb-47e0-9b31-be35cb7e156f' THEN
        RAISE EXCEPTION 'VIOLAÇÃO DE SEGURANÇA: O sistema LeadFlow Pro admite apenas 1 Master Admin fixo por contrato.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_enforce_single_master ON public.profiles;
CREATE TRIGGER tr_enforce_single_master
    BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_single_master_id();

-- 4. LOG DE SEGURANÇA
INSERT INTO public.activity_logs (tenant_id, user_id, action, details)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '3a760c29-accb-47e0-9b31-be35cb7e156f',
    'SECURITY_HIGHLANDER_RULE_APPLIED',
    'O sistema foi blindado para aceitar apenas um ID de Master Admin único e inalterável.'
);

COMMENT ON INDEX idx_single_master_admin IS 'Highlander Rule: Only one user can be is_master_admin=true.';
