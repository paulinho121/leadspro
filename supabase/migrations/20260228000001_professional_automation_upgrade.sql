-- ========================================================
-- LEADFLOW PRO - ENGENHARIA DE AUTOMAÇÃO PROFISSIONAL
-- Foco: Resiliência, Retries e Observabilidade
-- ========================================================

-- 1. MELHORIA NA FILA DE MENSAGENS (RESILIÊNCIA)
ALTER TABLE message_queue 
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. TABELA DE AUDITORIA DE EXECUÇÃO (OBSERVABILIDADE)
CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID, -- Referência a rule ou sequence
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'trigger_fired', 'condition_checked', 'action_executed', 'error'
    status TEXT NOT NULL, -- 'success', 'failure', 'skipped'
    details JSONB DEFAULT '{}'::jsonb, -- Payload executado, resposta da API, erro detalhado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e Política de Isolamento
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Automation Logs: isolation" ON automation_execution_logs 
FOR ALL USING (tenant_id = get_auth_tenant());

-- 3. ÍNDICES PARA O WORKER
CREATE INDEX IF NOT EXISTS idx_msg_queue_retry ON message_queue(status, next_retry_at) 
WHERE status IN ('pending', 'failed');

-- 4. FUNÇÃO PARA LOGAR EXECUÇÃO (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION log_automation_event(
    p_tenant_id UUID,
    p_automation_id UUID,
    p_lead_id UUID,
    p_event_type TEXT,
    p_status TEXT,
    p_details JSONB
) RETURNS void AS $$
BEGIN
    INSERT INTO automation_execution_logs (tenant_id, automation_id, lead_id, event_type, status, details)
    VALUES (p_tenant_id, p_automation_id, p_lead_id, p_event_type, p_status, p_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
