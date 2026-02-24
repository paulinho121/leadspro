
-- Tabela de Inscrições em Cadências (Enrollments)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES outreach_sequences(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'stopped'
    last_action_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_action_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(lead_id, sequence_id)
);

-- Políticas RLS para Enrollments
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sequence_enrollments from their tenant"
    ON sequence_enrollments FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can insert sequence_enrollments for their tenant"
    ON sequence_enrollments FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can update sequence_enrollments from their tenant"
    ON sequence_enrollments FOR UPDATE
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Users can delete sequence_enrollments from their tenant"
    ON sequence_enrollments FOR DELETE
    USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Índices para performance
CREATE INDEX idx_enrollments_tenant ON sequence_enrollments(tenant_id);
CREATE INDEX idx_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX idx_enrollments_next_action ON sequence_enrollments(next_action_at) WHERE status = 'active';
