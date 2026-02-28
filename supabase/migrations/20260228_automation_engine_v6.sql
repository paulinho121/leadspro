-- ============================================================
-- LEADFLOW PRO — V6.0 AUTOMATION ENGINE UPGRADE
-- Worker Health, A/B Testing, Engajamento, Enrollments Fix
-- ============================================================

-- 1. TABELA DE SAÚDE DO WORKER (heartbeat 24/7)
CREATE TABLE IF NOT EXISTS worker_health (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'unknown', -- 'healthy', 'degraded', 'offline'
    last_run_at TIMESTAMP WITH TIME ZONE,
    last_results JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sem RLS — acessível pelo service_role do worker e por todos os admins para leitura
-- (tabela de sistema, não multi-tenant)

-- 2. RASTREAMENTO DE ENGAJAMENTO (abertura, leitura, resposta)
ALTER TABLE message_queue
    ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'queued',
    -- 'queued', 'sent', 'delivered', 'read', 'replied', 'bounced', 'failed'
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS open_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paused BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ab_variant_id TEXT;

-- 3. A/B TESTING PARA CAMPANHAS
ALTER TABLE outreach_campaigns
    ADD COLUMN IF NOT EXISTS ab_testing_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ab_variants JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS use_ai_personalization BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS sending_window_start INTEGER DEFAULT 8,
    ADD COLUMN IF NOT EXISTS sending_window_end INTEGER DEFAULT 20,
    ADD COLUMN IF NOT EXISTS daily_limit INTEGER DEFAULT 150;

-- 4. TABELA DE VARIANTES A/B (para análise estatística)
CREATE TABLE IF NOT EXISTS campaign_ab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    convert_count INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, variant_id)
);

ALTER TABLE campaign_ab_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "AB Results: isolation" ON campaign_ab_results;
CREATE POLICY "AB Results: isolation" ON campaign_ab_results
    FOR ALL USING (tenant_id = get_auth_tenant());

-- 5. SCORE DE ENGAJAMENTO POR LEAD
ALTER TABLE leads
    ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN DEFAULT false;

-- 6. AÇÃO 'enroll_sequence' NAS AUTOMAÇÕES
-- Já está coberta pelo action_type existente — adicionando constraint de valores válidos
DO $$
BEGIN
    -- Verificar se a coluna next_retry_at existe (da migration anterior)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'message_queue' AND column_name = 'next_retry_at') THEN
        ALTER TABLE message_queue ADD COLUMN next_retry_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    -- Verificar se sequence_enrollments tem os campos necessários
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_enrollments' AND column_name = 'completed_at') THEN
        ALTER TABLE sequence_enrollments ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_enrollments' AND column_name = 'last_action_at') THEN
        ALTER TABLE sequence_enrollments ADD COLUMN last_action_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- communication_settings: campo from_email para customização do remetente
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_settings' AND column_name = 'from_email') THEN
        ALTER TABLE communication_settings ADD COLUMN from_email TEXT;
    END IF;
END $$;

-- 7. FUNÇÃO: INCREMENTAR SCORE DE ENGAJAMENTO
CREATE OR REPLACE FUNCTION increment_engagement_score(
    p_lead_id UUID,
    p_event TEXT -- 'sent'=5, 'delivered'=10, 'read'=20, 'replied'=30, 'converted'=50
) RETURNS void AS $$
DECLARE
    v_points INTEGER;
BEGIN
    v_points := CASE p_event
        WHEN 'sent' THEN 5
        WHEN 'delivered' THEN 10
        WHEN 'read' THEN 20
        WHEN 'replied' THEN 30
        WHEN 'converted' THEN 50
        ELSE 0
    END;

    UPDATE leads
    SET
        engagement_score = COALESCE(engagement_score, 0) + v_points,
        last_contacted_at = CASE WHEN p_event = 'sent' THEN NOW() ELSE last_contacted_at END,
        contact_count = CASE WHEN p_event = 'sent' THEN COALESCE(contact_count, 0) + 1 ELSE contact_count END,
        reply_count = CASE WHEN p_event = 'replied' THEN COALESCE(reply_count, 0) + 1 ELSE reply_count END
    WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNÇÃO: ATUALIZAR ESTATÍSTICAS DE A/B TESTING
CREATE OR REPLACE FUNCTION update_ab_result(
    p_campaign_id UUID,
    p_variant_id TEXT,
    p_event TEXT -- 'sent', 'delivered', 'read', 'replied', 'converted'
) RETURNS void AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM outreach_campaigns WHERE id = p_campaign_id;

    INSERT INTO campaign_ab_results (tenant_id, campaign_id, variant_id)
    VALUES (v_tenant_id, p_campaign_id, p_variant_id)
    ON CONFLICT (campaign_id, variant_id) DO NOTHING;

    UPDATE campaign_ab_results
    SET
        sent_count = CASE WHEN p_event = 'sent' THEN sent_count + 1 ELSE sent_count END,
        delivered_count = CASE WHEN p_event = 'delivered' THEN delivered_count + 1 ELSE delivered_count END,
        read_count = CASE WHEN p_event = 'read' THEN read_count + 1 ELSE read_count END,
        reply_count = CASE WHEN p_event = 'replied' THEN reply_count + 1 ELSE reply_count END,
        convert_count = CASE WHEN p_event = 'converted' THEN convert_count + 1 ELSE convert_count END,
        updated_at = NOW()
    WHERE campaign_id = p_campaign_id AND variant_id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. ÍNDICES DE PERFORMANCE PARA O WORKER
CREATE INDEX IF NOT EXISTS idx_sequence_enrollments_due
    ON sequence_enrollments(status, next_action_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_leads_engagement
    ON leads(tenant_id, engagement_score DESC);

CREATE INDEX IF NOT EXISTS idx_msg_queue_paused
    ON message_queue(campaign_id, status)
    WHERE status IN ('pending', 'paused', 'failed');

CREATE INDEX IF NOT EXISTS idx_automation_logs_tenant_time
    ON automation_execution_logs(tenant_id, created_at DESC);

-- 10. VIEW DE HEALTH DASHBOARD (usada pelo AutomationHealthDashboard)
CREATE OR REPLACE VIEW v_automation_health AS
SELECT
    t.id AS tenant_id,
    -- Fila atual
    COUNT(mq.id) FILTER (WHERE mq.status = 'pending') AS queue_pending,
    COUNT(mq.id) FILTER (WHERE mq.status = 'processing') AS queue_processing,
    COUNT(mq.id) FILTER (WHERE mq.status = 'sent' AND mq.sent_at > NOW() - INTERVAL '24 hours') AS sent_last_24h,
    COUNT(mq.id) FILTER (WHERE mq.status = 'failed' AND mq.created_at > NOW() - INTERVAL '24 hours') AS failed_last_24h,
    -- Campanhas
    COUNT(DISTINCT oc.id) FILTER (WHERE oc.status = 'running') AS active_campaigns,
    -- Cadências
    COUNT(DISTINCT se.id) FILTER (WHERE se.status = 'active') AS active_sequences,
    -- Taxa de entrega geral
    CASE
        WHEN COUNT(mq.id) FILTER (WHERE mq.status IN ('sent', 'failed') AND mq.created_at > NOW() - INTERVAL '7 days') > 0
        THEN ROUND(
            COUNT(mq.id) FILTER (WHERE mq.status = 'sent' AND mq.created_at > NOW() - INTERVAL '7 days')::numeric /
            COUNT(mq.id) FILTER (WHERE mq.status IN ('sent', 'failed') AND mq.created_at > NOW() - INTERVAL '7 days')::numeric * 100,
            1
        )
        ELSE 0
    END AS delivery_rate_7d
FROM tenants t
LEFT JOIN message_queue mq ON mq.tenant_id = t.id
LEFT JOIN outreach_campaigns oc ON oc.tenant_id = t.id
LEFT JOIN sequence_enrollments se ON se.tenant_id = t.id
GROUP BY t.id;

COMMENT ON VIEW v_automation_health IS 'Métricas de saúde do motor de automação por tenant';
