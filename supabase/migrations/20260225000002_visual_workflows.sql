
-- Tabela para armazenar workflows visuais (grafos)
CREATE TABLE IF NOT EXISTS visual_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ativar RLS
ALTER TABLE visual_workflows ENABLE ROW LEVEL SECURITY;

-- Política de isolamento
DROP POLICY IF EXISTS "Visual Workflows: isolation" ON visual_workflows;
CREATE POLICY "Visual Workflows: isolation" ON visual_workflows 
FOR ALL USING (tenant_id = get_auth_tenant());

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_visual_workflows_tenant ON visual_workflows(tenant_id);
