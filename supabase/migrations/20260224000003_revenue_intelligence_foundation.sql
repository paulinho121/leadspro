-- ========================================================
-- LEADFLOW PRO - REVENUE INTELLIGENCE FOUNDATION
-- Versão: 4.0 - Fase 1: Estrutural (Pipeline & Conversão)
-- ========================================================

-- 1. TABELA DE CAMPANHAS (Estratégias de Outreach)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'paused', 'completed'
    target_niche TEXT,
    target_location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABELA DE NEGÓCIOS (Deals) - Transforma Leads em Pipeline
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE UNIQUE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    
    -- Financeiro & Probabilidade
    estimated_value DECIMAL(12,2) DEFAULT 0.00,
    probability_to_close DECIMAL(3,2) DEFAULT 0.10, -- 0.00 a 1.00
    
    -- Funil
    stage TEXT NOT NULL DEFAULT 'discovery', -- 'discovery', 'proposal', 'negotiation', 'won', 'lost'
    status TEXT NOT NULL DEFAULT 'open', -- 'open', 'won', 'lost', 'abandoned'
    
    lost_reason TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HISTÓRICO DE MUDANÇAS NO FUNIL (Auditoria & ML Data)
CREATE TABLE IF NOT EXISTS deal_stages_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    from_stage TEXT,
    to_stage TEXT NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. GESTÃO DE TERRITÓRIOS E EXCLUSIVIDADE
CREATE TABLE IF NOT EXISTS territories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Null se for território global/livre
    niche TEXT NOT NULL,
    location_state TEXT NOT NULL,
    location_city TEXT,
    is_exclusive BOOLEAN DEFAULT false,
    exclusive_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. EXTENSÃO DA TABELA DE LEADS
-- Adicionando novos indicadores de inteligência
ALTER TABLE leads ADD COLUMN IF NOT EXISTS p2c_score DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS intent_signals JSONB DEFAULT '[]'::jsonb;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_clonality_check TIMESTAMP WITH TIME ZONE;

-- 6. SEGURANÇA (RLS)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_stages_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;

-- Políticas de Isolamento (Reutilizando a função get_auth_tenant)
CREATE POLICY "Campaigns: isolation" ON campaigns FOR ALL USING (tenant_id = get_auth_tenant() OR tenant_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "Deals: isolation" ON deals FOR ALL USING (tenant_id = get_auth_tenant() OR tenant_id = '00000000-0000-0000-0000-000000000000');
CREATE POLICY "History: isolation" ON deal_stages_history FOR SELECT USING (EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_id AND d.tenant_id = get_auth_tenant()));
CREATE POLICY "Territories: global read" ON territories FOR SELECT USING (true);
CREATE POLICY "Territories: tenant manage" ON territories FOR ALL USING (tenant_id = get_auth_tenant());

-- 7. ÍNDICES
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_territories_search ON territories(niche, location_state, location_city);
