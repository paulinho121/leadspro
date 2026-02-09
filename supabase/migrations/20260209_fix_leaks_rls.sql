
-- ======================================================
-- SEGURANÇA REFORÇADA: ISOLAMENTO DE HISTÓRICO (LOGS)
-- ======================================================

-- 1. Limpar políticas antigas na tabela de logs
DROP POLICY IF EXISTS "Atividades: isolamento por tenant" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_isolation" ON public.activity_logs;

-- 2. Garantir RLS habilitado
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Nova Política de Isolamento Estrito
-- Usuários comuns: Vêem apenas logs onde tenant_id bate com o seu perfil
-- Master Admin: Vê absolutamente tudo (auditabilidade total)
CREATE POLICY "activity_logs_strict_isolation" ON public.activity_logs
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR 
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR 
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    );

-- 4. Notificações também merecem o mesmo tratamento estrito
DROP POLICY IF EXISTS "Notificações: isolamento por tenant" ON public.notifications;
CREATE POLICY "notifications_strict_isolation" ON public.notifications
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR 
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR 
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    );
