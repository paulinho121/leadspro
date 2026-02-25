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
DROP POLICY IF EXISTS "Comm Settings: isolation" ON communication_settings;
CREATE POLICY "Comm Settings: isolation" ON communication_settings FOR ALL USING (tenant_id = get_auth_tenant());

DROP POLICY IF EXISTS "Campaigns: isolation" ON outreach_campaigns;
CREATE POLICY "Campaigns: isolation" ON outreach_campaigns FOR ALL USING (tenant_id = get_auth_tenant());

DROP POLICY IF EXISTS "Message Queue: isolation" ON message_queue;
CREATE POLICY "Message Queue: isolation" ON message_queue FOR ALL USING (tenant_id = get_auth_tenant());

DROP POLICY IF EXISTS "Automation Rules: isolation" ON automation_rules;
CREATE POLICY "Automation Rules: isolation" ON automation_rules FOR ALL USING (tenant_id = get_auth_tenant());

-- 6. ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_msg_queue_status ON message_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_msg_queue_scheduled ON message_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_campaign_tenant ON outreach_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rules_tenant ON automation_rules(tenant_id);

-- 7. FUNÇÕES AUXILIARES
CREATE OR REPLACE FUNCTION increment_campaign_processed(campaign_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE outreach_campaigns
    SET processed_leads = processed_leads + 1
    WHERE id = campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. AJUSTES DE SEGURANÇA (PERMITIR ACESSO DO SISTEMA)
-- Adicionando política para que o sistema (service_role ou worker) possa ler e apagar se necessário
DROP POLICY IF EXISTS "AI SDR: isolation" ON ai_sdr_interactions;
CREATE POLICY "AI SDR: isolation" ON ai_sdr_interactions 
FOR ALL USING (tenant_id = get_auth_tenant() OR tenant_id = '00000000-0000-0000-0000-000000000000');

-- 9. ADICIONAR COLUNA METADATA SE NÃO EXISTIR
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_sdr_interactions' AND column_name = 'metadata') THEN
        ALTER TABLE ai_sdr_interactions ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Garantir que a tabela leads tem a coluna email para os disparos
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'email') THEN
        ALTER TABLE leads ADD COLUMN email TEXT;
    END IF;

    -- Adicionar client_token para Z-API
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'communication_settings' AND column_name = 'client_token') THEN
        ALTER TABLE communication_settings ADD COLUMN client_token TEXT;
    END IF;
END $$;
