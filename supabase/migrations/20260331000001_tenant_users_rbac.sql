-- =========================================================================
-- SUPER ENGINEER: PATCH DE SEGURANÇA RBAC PARA ESCALONAMENTO DE PRIVILÉGIOS (Área 3)
-- Data: 2026-03-31
-- Alvo: public.tenant_users
-- Correção: Previne que usuários normais (vendedores) fraudem a própria 
--           flag de privilégio (role) para "admin" (Privilege Escalation), 
--           e também previne que insiram/deletem usuários em sua organização maliciosamente.
-- =========================================================================

-- 1. Criação do Sistema Escudo de Trigger Anti-Fraude
CREATE OR REPLACE FUNCTION public.enforce_tenant_users_rbac()
RETURNS TRIGGER AS $$
DECLARE
    v_is_master BOOLEAN;
    v_user_email TEXT;
    v_is_local_admin BOOLEAN;
    v_target_tenant UUID;
    v_auth_role TEXT;
BEGIN
    -- Captura qual serviço/usuário iniciou a transação no banco (service_role ignora restrições)
    v_auth_role := auth.role();

    -- 1. Bypass Absoluto para o Sistema Interno (Integrações Stripe, Background Workers ou Admin Global)
    IF v_auth_role = 'service_role' OR v_auth_role = 'postgres' OR v_auth_role IS NULL THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 2. Define dinamicamente quem é o Inquilino (Tenant) desta transação (OLD pra delete, NEW pros demais)
    IF TG_OP = 'DELETE' THEN
        v_target_tenant := OLD.tenant_id;
    ELSE
        v_target_tenant := NEW.tenant_id;
    END IF;

    -- 3. Bypass Master Admin: Eles supervisionam o sistema inteiro
    SELECT is_master_admin INTO v_is_master FROM public.profiles WHERE id = auth.uid();
    IF v_is_master = true THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- 4. Extrator Criptográfico do E-mail do Usuário no Token JWT 
    v_user_email := auth.jwt() ->> 'email';

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION '🔒 [Trancado] Sessão maliciosa ou JWT vazio recusado.';
    END IF;

    -- 5. Interrogatório Arquitetural: O Autor tem crachá de "admin" na Base da Empresa (tenant_users)?
    SELECT true INTO v_is_local_admin 
    FROM public.tenant_users 
    WHERE email = v_user_email 
      AND tenant_id = v_target_tenant 
      AND role = 'admin' 
    LIMIT 1;

    -- 6. Execução do Sentenciamento RBAC (Role-Based Access Control)
    IF v_is_local_admin IS NOT TRUE THEN
        
        -- Flagrante A: Um vendedor tentou POST (adicionar colegas) ou DELETE (excluir colegas) na API.
        IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
            RAISE EXCEPTION '🔒 [Trancado] Acesso Negado: Apenas o dono ou "admin" visualizam e alteram usuários do time.';
        END IF;

        -- Flagrante B: Um vendedor tentou usar um PATCH/UPDATE na própria tabela pelo Front-end injetando role: 'admin'
        IF TG_OP = 'UPDATE' THEN
            -- Ele não pode virar administrador da revenda burlando a Interface Lógica
            -- Restabeleceremos forçadamente o privilégio que ele já detinha (OLD.role).
            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE NOTICE 'Ataque de Elevação de Privilégio (Privilege Escalation) contido interceptando usuário: %', v_user_email;
            END IF;
            
            NEW.role = OLD.role;
            NEW.tenant_id = OLD.tenant_id; -- Não pode invadir o painel de outro cliente
            
            -- Se seu sistema atual não permite alteração nem do e-mail ou nome para vendedores, podemos abortar a ação total:
            -- RAISE EXCEPTION '🔒 [Trancado] Acesso Negado: Vendedores não têm permissão para manipular este usuário.';
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpar qualquer Trigger concorrente inseguro e Aplicar o Sistema Isolado (Pentest Fix)
DROP TRIGGER IF EXISTS tr_enforce_tenant_users_rbac ON public.tenant_users;

CREATE TRIGGER tr_enforce_tenant_users_rbac
    BEFORE INSERT OR UPDATE OR DELETE ON public.tenant_users
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_tenant_users_rbac();

-- Registro na infraestrutura de Histórico para Auditorias
COMMENT ON TRIGGER tr_enforce_tenant_users_rbac ON public.tenant_users IS 'Patch [2026-03-31]: Bloqueio Robusto contra Privilege Escalation via injeção SQL no Front-end (Role Hacking)';
