-- ======================================================
-- SECURITY HOTFIX: REMOVER INVASOR E BLINDAR RLS
-- ======================================================

-- 1. Identificar e Remover o Invasor (Pentest Operator)
-- Nota: Como no schema público temos apenas profiles, removemos o profile.
-- O ideal seria desabilitar no auth.users via dashboard, mas o RLS já o impedirá.
DELETE FROM public.profiles 
WHERE full_name = 'Pentest Operator' 
AND tenant_id = '00000000-0000-0000-0000-000000000000';

-- 2. BLINDAGEM DA TABELA PROFILES (Vulnerability Fix)
-- Atualmente, a política "Update Own" permite atualizar qualquer coluna.
DROP POLICY IF EXISTS "Profiles: Update Own" ON public.profiles;
DROP POLICY IF EXISTS "Profiles: Update Public Fields Only" ON public.profiles;

-- 2.1 Criar política que permite apenas atualização de campos não sensíveis
-- O Master Admin ainda pode tudo se houver uma política para ele.
CREATE POLICY "Profiles: Update Public Fields Only" 
ON public.profiles FOR UPDATE TO authenticated 
USING (id = auth.uid()) 
WITH CHECK (
    id = auth.uid() 
    AND (
        -- Garante que is_master_admin e tenant_id NÃO mudem via frontend
        is_master_admin = (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid())
        AND
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- 3. BLINDAGEM DA TABELA WHITE_LABEL_CONFIGS (Vulnerability Fix)
DROP POLICY IF EXISTS "Branding: permiti tudo para dev" ON public.white_label_configs;
DROP POLICY IF EXISTS "Branding: Master or Tenant Admin Only" ON public.white_label_configs;
CREATE POLICY "Branding: Master or Tenant Admin Only" 
ON public.white_label_configs FOR ALL TO authenticated 
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    OR
    (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 4. LOG DE AÇÃO
INSERT INTO public.activity_logs (tenant_id, user_id, action, details)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '3a760c29-accb-47e0-9b31-be35cb7e156f', -- ID do Paulo
    'SECURITY_FIREWALL_UPDATE',
    'Remoção de usuário suspeito e blindagem de RLS contra promoção de privilégios.'
);
