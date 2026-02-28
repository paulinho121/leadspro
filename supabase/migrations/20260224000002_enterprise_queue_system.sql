-- ========================================================
-- LEADFLOW PRO - ENTERPRISE TASK QUEUE SYSTEM
-- Versão: 1.0 - Orquestração de Jobs em Background
-- ========================================================

-- 1. TABELA DE FILA DE TAREFAS
CREATE TABLE IF NOT EXISTS background_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'ENRICH_BATCH', 'DISCOVERY_STATE', 'DATA_EXPORT'
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    progress INTEGER DEFAULT 0,
    result JSONB,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- 2. SEGURANÇA (RLS)
ALTER TABLE background_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks: user isolation" ON background_tasks 
    FOR SELECT USING (tenant_id = get_auth_tenant());

-- Master Admin pode ver tudo
CREATE POLICY "Tasks: master monitoring" ON background_tasks 
    FOR SELECT USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_master_admin = true));

-- 3. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_tasks_status ON background_tasks(status, created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON background_tasks(tenant_id);

-- 4. FUNÇÃO DE CLAIM (Para Workers buscarem tarefas sem colisão)
CREATE OR REPLACE FUNCTION claim_background_task(p_worker_id TEXT) 
RETURNS TABLE (
    task_id UUID,
    task_type TEXT,
    task_payload JSONB,
    task_tenant_id UUID
) AS $$
DECLARE
    v_task_id UUID;
BEGIN
    -- Busca a tarefa pendente mais antiga e marca como processing
    SELECT id INTO v_task_id 
    FROM background_tasks 
    WHERE status = 'pending' 
    ORDER BY created_at ASC 
    LIMIT 1 
    FOR UPDATE SKIP LOCKED;

    IF v_task_id IS NOT NULL THEN
        UPDATE background_tasks 
        SET status = 'processing',
            started_at = NOW(),
            updated_at = NOW()
        WHERE id = v_task_id;

        RETURN QUERY SELECT id, type, payload, tenant_id 
                     FROM background_tasks 
                     WHERE id = v_task_id;
    END IF;
END;
$$ LANGUAGE plpgsql;
