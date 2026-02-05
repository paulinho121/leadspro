-- ==========================================
-- LEADFLOW PRO - DATABASE SCHEMA (SQL)
-- Versão: 3.0 (Multi-tenancy & White Label)
-- ==========================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE TENANTS (Organizações/Clientes White Label)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- ex: 'agencia-alpha'
    plan TEXT DEFAULT 'pro', -- 'free', 'pro', 'enterprise'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir Tenant Padrão para Desenvolvimento
INSERT INTO tenants (id, name, slug) 
VALUES ('00000000-0000-0000-0000-000000000000', 'Default Organization', 'default')
ON CONFLICT (id) DO NOTHING;

-- 3. PERFIS DE USUÁRIO (Relação Usuário x Empresa)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'vendedor', -- 'admin', 'gerente', 'vendedor'
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CONFIGURAÇÃO WHITE LABEL (Personalização por Tenant)
CREATE TABLE IF NOT EXISTS white_label_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    platform_name TEXT NOT NULL DEFAULT 'LeadFlow Pro',
    logo_url TEXT,
    favicon_url TEXT,
    
    -- Paleta de Cores
    primary_color TEXT DEFAULT '#06b6d4',
    secondary_color TEXT DEFAULT '#3b82f6',
    accent_color TEXT DEFAULT '#06b6d4',
    background_color TEXT DEFAULT '#0f172a',
    sidebar_color TEXT DEFAULT 'rgba(30, 41, 59, 0.7)',
    
    -- Domínios Customizados
    custom_domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    
    -- Chaves de API Próprias (Encripte estes dados em produção!)
    api_keys JSONB DEFAULT '{
        "gemini": null,
        "openai": null,
        "deepseek": null
    }'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GARANTIR COLUNAS EM WHITE_LABEL_CONFIGS (Caso a tabela já exista de migração antiga)
DO $$
BEGIN
    ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '#06b6d4';
    ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '#0f172a';
    ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS sidebar_color TEXT DEFAULT 'rgba(30, 41, 59, 0.7)';
    ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS api_keys JSONB DEFAULT '{
        "gemini": null, 
        "openai": null, 
        "deepseek": null
    }'::jsonb;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Inserir Configuração Padrão para o Tenant de Desenvolvimento (ESSENCIAL PARA FUNCIONAR LOCALMENTE)
INSERT INTO white_label_configs (tenant_id, platform_name, primary_color, secondary_color)
VALUES (
    '00000000-0000-0000-0000-000000000000', 
    'LeadFlow Neural (Dev)', 
    '#06b6d4', 
    '#3b82f6'
)
ON CONFLICT (tenant_id) DO NOTHING;

-- 5. TABELA DE LEADS (Coração do Sistema)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    
    -- Dados Básicos
    name TEXT NOT NULL,
    website TEXT,
    phone TEXT,
    industry TEXT,
    location TEXT,
    status TEXT DEFAULT 'NEW', -- 'NEW', 'ENRICHING', 'ENRICHED', 'DISQUALIFIED'
    
    -- Dados Estruturados (JSONB para flexibilidade)
    details JSONB DEFAULT '{}'::jsonb, -- CNPJ, Razão Social, QSA, etc.
    social_links JSONB DEFAULT '{
        "instagram": null,
        "facebook": null,
        "google": null,
        "cnpj": null
    }'::jsonb,
    
    -- Inteligência Artificial
    ai_insights TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. LOGS DE USO DE API (Controle de Custos/Consumo)
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    api_name TEXT NOT NULL, -- 'gemini', 'maps', etc.
    endpoint TEXT,
    status_code INTEGER,
    credits_used INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. MEMBROS DA EQUIPE (Gestão de Usuários)
CREATE TABLE IF NOT EXISTS tenant_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vendedor', -- 'admin', 'vendedor'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'invited', 'revoked'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- SEGURANÇA: ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;

-- FUNÇÃO AJUDANTE: Obter Tenant ID do usuário logado
CREATE OR REPLACE FUNCTION get_auth_tenant()
RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- POLÍTICAS PARA LEADS (Multi-tenancy total + DEV MODE)
DROP POLICY IF EXISTS "Leads: isolamento por tenant" ON leads;
DROP POLICY IF EXISTS "Leads: dev mode public" ON leads;

CREATE POLICY "Leads: isolamento e dev mix" ON leads
    FOR ALL USING (
        tenant_id = get_auth_tenant() OR 
        tenant_id = '00000000-0000-0000-0000-000000000000' -- Permite acesso ao tenant default para dev
    );

-- POLÍTICAS PARA WHITE LABEL
DROP POLICY IF EXISTS "Branding: leitura pública" ON white_label_configs;
CREATE POLICY "Branding: leitura pública" ON white_label_configs
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Branding: permiti tudo para dev" ON white_label_configs;
CREATE POLICY "Branding: permiti tudo para dev" ON white_label_configs
    FOR ALL USING (true)
    WITH CHECK (true);
    
DROP POLICY IF EXISTS "Public read for branding" ON white_label_configs; -- Limpar politica antiga
DROP POLICY IF EXISTS "Tenant admins can update branding" ON white_label_configs; -- Limpar politica antiga

-- POLÍTICAS PARA PERFIS
DROP POLICY IF EXISTS "Profiles: ver membros da mesma empresa" ON profiles;
CREATE POLICY "Profiles: ver membros da mesma empresa" ON profiles
    FOR SELECT USING (tenant_id = get_auth_tenant());

-- POLÍTICAS PARA MEMBROS
DROP POLICY IF EXISTS "Membros: gerenciar mesma empresa" ON tenant_users;
CREATE POLICY "Membros: gerenciar mesma empresa" ON tenant_users
    FOR ALL USING (true); -- SIMPLIFICADO PARA DEV (Em prod: checar tenant_id)

-- POLÍTICAS PARA LOGS
DROP POLICY IF EXISTS "Logs: ver consumo da empresa" ON api_usage_logs;
CREATE POLICY "Logs: ver consumo da empresa" ON api_usage_logs
    FOR SELECT USING (
        tenant_id = get_auth_tenant() OR 
        tenant_id = '00000000-0000-0000-0000-000000000000'
    );
    
DROP POLICY IF EXISTS "Tenants can view their own usage" ON api_usage_logs; -- Limpar politica antiga

-- ==========================================
-- ÍNDICES PARA PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_logs_tenant ON api_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configs_tenant ON white_label_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_configs_domain ON white_label_configs(custom_domain);
