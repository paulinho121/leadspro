-- ========================================================
-- LEADFLOW PRO - MASS OUTREACH & SMART AUTOMATIONS
-- Versão: 5.0 - Engine de Prospecção e Respostas
-- ========================================================

-- 1. CONFIGURAÇÕES DE COMUNICAÇÃO POR TENANT
CREATE TABLE IF NOT EXISTS communication_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL, -- 'whatsapp_evolution', 'email_resend', 'email_smtp'
    api_key TEXT,
    api_url TEXT,
    instance_name TEXT, -- Para Evolution API
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, provider_type)
);

-- 2. CAMPANHAS DE DISPARO EM MASSA
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'running', 'paused', 'completed'
    channel TEXT NOT NULL, -- 'whatsapp', 'email'
    template_content TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    total_leads INTEGER DEFAULT 0,
    processed_leads INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. FILA DE MENSAGENS (Delay Humano & Rate Limit)
CREATE TABLE IF NOT EXISTS message_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES outreach_campaigns(id) ON DELETE SET NULL,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'scheduled'
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. REGRAS DE AUTOMAÇÃO (ESTILO n8n)
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- 'incoming_message', 'lead_enriched', 'status_changed'
    conditions JSONB DEFAULT '{}'::jsonb, -- ex: { "intent": "positive" }
    action_type TEXT NOT NULL, -- 'send_reply', 'move_stage', 'notify_admin'
    action_payload JSONB DEFAULT '{}'::jsonb, -- ex: { "template": "...", "stage_id": "..." }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. SEGURANÇA (RLS)
ALTER TABLE communication_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento por Tenant
CREATE POLICY "Comm Settings: isolation" ON communication_settings FOR ALL USING (tenant_id = get_auth_tenant());
CREATE POLICY "Campaigns: isolation" ON outreach_campaigns FOR ALL USING (tenant_id = get_auth_tenant());
CREATE POLICY "Message Queue: isolation" ON message_queue FOR ALL USING (tenant_id = get_auth_tenant());
CREATE POLICY "Automation Rules: isolation" ON automation_rules FOR ALL USING (tenant_id = get_auth_tenant());

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX idx_msg_queue_status ON message_queue(status) WHERE status = 'pending';
CREATE INDEX idx_msg_queue_scheduled ON message_queue(scheduled_for);
CREATE INDEX idx_campaign_tenant ON outreach_campaigns(tenant_id);
CREATE INDEX idx_rules_tenant ON automation_rules(tenant_id);
