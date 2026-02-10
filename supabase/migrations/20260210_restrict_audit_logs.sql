
-- ======================================================
-- SEGURANÇA SÊNIOR: LOGS EXCLUSIVOS PARA MASTER ADMIN
-- ======================================================

-- 1. Limpar políticas existentes
DROP POLICY IF EXISTS "activity_logs_strict_isolation" ON public.activity_logs;
DROP POLICY IF EXISTS "Atividades: isolamento por tenant" ON public.activity_logs;

-- 2. Garantir que RLS está ativo
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política de INSERÇÃO (Permitir que o sistema registre ações de todos)
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
    FOR INSERT 
    TO authenticated
    WITH CHECK (true); -- Permite registrar, mas não ler o que foi registrado

-- 4. Política de LEITURA (APENAS MASTER ADMIN)
CREATE POLICY "activity_logs_read_master_only" ON public.activity_logs
    FOR SELECT
    TO authenticated
    USING (
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    );

-- 5. Política de EXCLUSÃO/ATUALIZAÇÃO (APENAS MASTER ADMIN)
CREATE POLICY "activity_logs_modify_master_only" ON public.activity_logs
    FOR ALL
    TO authenticated
    USING (
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    )
    WITH CHECK (
        (SELECT COALESCE(is_master_admin, false) FROM public.profiles WHERE id = auth.uid()) = true
    );

COMMENT ON TABLE activity_logs IS 'Logs de auditoria restritos para visualização exclusiva do Master Admin.';
