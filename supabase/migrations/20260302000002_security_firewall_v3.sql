-- ======================================================
-- LEADFLOW PRO SECURITY FIREWALL (V3.0)
-- PROTEÇÃO CONTRA PROMOÇÃO DE PRIVILÉGIOS E VAZAMENTO 
-- ======================================================

-- 1. BLINDAGEM DE CAMPOS DE SISTEMA (Profiles)
-- Esta função e trigger impedem que QUALQUER usuário, exceto o superuser do Postgres (dashboard),
-- mude o seu tenant_id ou status de Master Admin via API / PostgREST.

CREATE OR REPLACE FUNCTION public.protect_profiles_system_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o nível de privilégio for de usuário autenticado (API pública)
    IF (current_setting('role') = 'authenticated') THEN
        -- IMPEDIR alteração de is_master_admin se o valor estiver mudando
        IF NEW.is_master_admin <> OLD.is_master_admin THEN
            NEW.is_master_admin = OLD.is_master_admin;
        END IF;

        -- IMPEDIR alteração de tenant_id se o valor estiver mudando
        IF NEW.tenant_id <> OLD.tenant_id THEN
            NEW.tenant_id = OLD.tenant_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_protect_profiles_system_fields ON public.profiles;
CREATE TRIGGER tr_protect_profiles_system_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_profiles_system_fields();

-- 2. HARDENIZAÇÃO DE CRÉDITOS (Previne débito em conta alheia)
CREATE OR REPLACE FUNCTION public.deduct_tenant_credits(
    p_tenant_id UUID,
    p_amount INT,
    p_service TEXT,
    p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
    v_auth_tenant_id UUID;
    v_is_master BOOLEAN;
BEGIN
    -- Obter tenant do usuário autenticado e status master
    SELECT tenant_id, is_master_admin INTO v_auth_tenant_id, v_is_master 
    FROM public.profiles WHERE id = auth.uid();

    -- VERIFICAÇÃO DE SEGURANÇA: Só pode descontar do próprio tenant ou se for Master Admin
    IF p_tenant_id <> v_auth_tenant_id AND COALESCE(v_is_master, false) = false THEN
        RAISE EXCEPTION 'Acesso negado: Tentativa de manipulação de saldo de terceiro.';
    END IF;

    SELECT credit_balance INTO v_current_balance 
    FROM public.tenant_wallets WHERE tenant_id = p_tenant_id FOR UPDATE;

    IF v_current_balance IS NULL THEN
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance) VALUES (p_tenant_id, 0);
        v_current_balance := 0;
    END IF;

    IF v_current_balance < p_amount THEN
        RETURN FALSE;
    END IF;

    UPDATE public.tenant_wallets 
    SET credit_balance = credit_balance - p_amount, updated_at = NOW()
    WHERE tenant_id = p_tenant_id;

    INSERT INTO public.credit_transactions (tenant_id, amount, type, service_name, description)
    VALUES (p_tenant_id, -p_amount, 'usage', p_service, p_description);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. REVOGAÇÃO DE PERMISSÕES PÚBLICAS EM FUNÇÕES CRÍTICAS
-- Previne que qualquer usuário chame funções de gerenciamento via PostgREST diretamente
REVOKE ALL ON FUNCTION public.add_tenant_credits(UUID, BIGINT, TEXT, TEXT) FROM public;
REVOKE ALL ON FUNCTION public.add_tenant_credits(UUID, BIGINT, TEXT, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.add_tenant_credits(UUID, BIGINT, TEXT, TEXT) FROM anon;

REVOKE ALL ON FUNCTION public.adjust_tenant_credits(UUID, INT, TEXT) FROM public;
-- Note: adjust_tenant_credits já tem check is_master_admin, mas restringir acesso é melhor.

-- 4. REMOÇÃO DE BACKDOOR NOS LEADS (Default Tenant Fallout)
-- Removemos a permissão geral para o tenant '00000000...' via RLS para usuários não-master
DROP POLICY IF EXISTS "Leads: Acesso por Tenant" ON public.leads;
CREATE POLICY "Leads: Isolamento Total (No Backdoor)" 
ON public.leads FOR ALL TO authenticated 
USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()) 
    OR 
    (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true
);

-- 5. AUDITORIA FINAL
COMMENT ON TRIGGER tr_protect_profiles_system_fields ON public.profiles IS 'Firewall Anti-Privilege Escalation: Bloqueia alteração manual de Master Admin e Tenant ID.';
