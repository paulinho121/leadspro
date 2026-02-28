-- ============================================================
-- LEADFLOW PRO — FIX COMPLETO 100%
-- Corrige automation_rules + realtime + trigger de progresso
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. RECRIA automation_rules COM TODAS AS COLUNAS CORRETAS
-- ────────────────────────────────────────────────────────────

-- Salva regras existentes antes de recriar (se houver)
CREATE TABLE IF NOT EXISTS automation_rules_backup AS
    SELECT * FROM automation_rules;

DROP TABLE IF EXISTS automation_rules CASCADE;

CREATE TABLE automation_rules (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name           TEXT NOT NULL DEFAULT 'Nova Regra',
    trigger_type   TEXT NOT NULL DEFAULT 'incoming_message',
    conditions     JSONB NOT NULL DEFAULT '{"intent": "positive"}'::jsonb,
    action_type    TEXT NOT NULL DEFAULT 'send_reply',
    action_payload JSONB NOT NULL DEFAULT '{"template": ""}'::jsonb,
    is_active      BOOLEAN DEFAULT true,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Automation Rules: isolation" ON automation_rules;
CREATE POLICY "Automation Rules: isolation" ON automation_rules
    FOR ALL USING (tenant_id = get_auth_tenant());

CREATE INDEX IF NOT EXISTS idx_rules_tenant ON automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON automation_rules(tenant_id, is_active) WHERE is_active = true;

-- Restaurar backup (só migra o que é compatível)
INSERT INTO automation_rules (tenant_id, name, trigger_type, conditions, action_type, action_payload, is_active, created_at)
SELECT
    tenant_id,
    COALESCE(name, 'Regra Migrada'),
    COALESCE(trigger_type, 'incoming_message'),
    COALESCE(conditions, condition_json, '{"intent": "positive"}'::jsonb),
    COALESCE(action_type, 'send_reply'),
    COALESCE(action_payload, '{"template": ""}'::jsonb),
    COALESCE(is_active, true),
    COALESCE(created_at, NOW())
FROM automation_rules_backup
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS automation_rules_backup;

-- ────────────────────────────────────────────────────────────
-- 2. HABILITAR REALTIME NAS TABELAS DE CAMPANHA E FILA
-- ────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE automation_rules;

-- ────────────────────────────────────────────────────────────
-- 3. TRIGGER: ATUALIZA processed_leads AUTOMATICAMENTE
--    Dispara toda vez que uma mensagem é marcada como 'sent' ou 'failed'
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_campaign_progress()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.campaign_id IS NULL THEN RETURN NEW; END IF;

    UPDATE outreach_campaigns
    SET
        processed_leads = (
            SELECT COUNT(*)
            FROM message_queue
            WHERE campaign_id = NEW.campaign_id
              AND status IN ('sent', 'failed')
        ),
        status = CASE
            WHEN (
                SELECT COUNT(*) FROM message_queue
                WHERE campaign_id = NEW.campaign_id
                  AND status IN ('sent', 'failed')
            ) >= COALESCE(total_leads, 1)
              AND status = 'running'
            THEN 'completed'
            ELSE status
        END
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_campaign_progress ON message_queue;
CREATE TRIGGER trg_update_campaign_progress
    AFTER UPDATE OF status ON message_queue
    FOR EACH ROW
    WHEN (NEW.status IN ('sent', 'failed') AND OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_campaign_progress();

-- ────────────────────────────────────────────────────────────
-- 4. BACKGROUND_TASKS: garantir que existe para o worker
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS background_tasks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    payload       JSONB DEFAULT '{}'::jsonb,
    status        TEXT DEFAULT 'pending',
    retry_count   INTEGER DEFAULT 0,
    error_message TEXT,
    started_at    TIMESTAMP WITH TIME ZONE,
    completed_at  TIMESTAMP WITH TIME ZONE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE background_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Background Tasks: isolation" ON background_tasks;
CREATE POLICY "Background Tasks: isolation" ON background_tasks
    FOR ALL USING (tenant_id = get_auth_tenant());

CREATE INDEX IF NOT EXISTS idx_bg_tasks_pending ON background_tasks(status, created_at)
    WHERE status = 'pending';

-- ────────────────────────────────────────────────────────────
-- 5. WORKER_HEALTH: garantir que existe
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS worker_health (
    id           TEXT PRIMARY KEY,
    status       TEXT DEFAULT 'unknown',
    last_run_at  TIMESTAMP WITH TIME ZONE,
    last_results JSONB DEFAULT '{}'::jsonb,
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- 6. VISUAL_WORKFLOWS: garantir que existe para o VisualBuilder
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visual_workflows (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        TEXT NOT NULL DEFAULT 'Novo Workflow',
    description TEXT,
    nodes       JSONB DEFAULT '[]'::jsonb,
    edges       JSONB DEFAULT '[]'::jsonb,
    is_active   BOOLEAN DEFAULT false,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE visual_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Visual Workflows: isolation" ON visual_workflows;
CREATE POLICY "Visual Workflows: isolation" ON visual_workflows
    FOR ALL USING (tenant_id = get_auth_tenant());

-- ────────────────────────────────────────────────────────────
-- 7. FORCE SCHEMA CACHE RELOAD (CRÍTICO — resolve o erro PostgREST)
-- ────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- VERIFICAÇÃO FINAL
-- ────────────────────────────────────────────────────────────
SELECT
    'automation_rules' AS tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'automation_rules'
ORDER BY ordinal_position;
