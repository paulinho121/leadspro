-- ========================================================
-- LEADFLOW PRO - AI SDR & AUTOMATION FOUNDATION
-- Versão: 4.1 - Fase 2: Automação
-- ========================================================

-- 1. HISTÓRICO DE INTERAÇÕES DO AI SDR
CREATE TABLE IF NOT EXISTS ai_sdr_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL, -- 'whatsapp', 'email', 'linkedin'
    direction TEXT NOT NULL, -- 'outbound', 'inbound'
    content TEXT NOT NULL,
    ai_analysis JSONB DEFAULT '{}'::jsonb, -- Sentimento, intenção detectada
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CADÊNCIAS DE ABORDAGEM (Sequences)
CREATE TABLE IF NOT EXISTS outreach_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    steps JSONB DEFAULT '[]'::jsonb, -- Array de delays e mensagens
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SEGURANÇA (RLS)
ALTER TABLE ai_sdr_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI SDR: isolation" ON ai_sdr_interactions FOR ALL USING (tenant_id = get_auth_tenant() OR tenant_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Sequences: isolation" ON outreach_sequences FOR ALL USING (tenant_id = get_auth_tenant() OR tenant_id = '00000000-0000-0000-0000-000000000000');

-- 4. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_sdr_lead ON ai_sdr_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_sdr_tenant ON ai_sdr_interactions(tenant_id);
