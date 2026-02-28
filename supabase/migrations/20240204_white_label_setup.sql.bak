
-- Enable RLS
-- Create white_label_configs table
CREATE TABLE IF NOT EXISTS white_label_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL UNIQUE,
    platform_name TEXT NOT NULL DEFAULT 'LeadFlow Pro',
    logo_url TEXT,
    favicon_url TEXT,
    primary_color TEXT DEFAULT '#06b6d4',
    secondary_color TEXT DEFAULT '#3b82f6',
    custom_domain TEXT UNIQUE,
    subdomain TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on white_label_configs
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read branding if they know the domain/ID (for landing pages)
CREATE POLICY "Public read for branding" ON white_label_configs
    FOR SELECT USING (true);

-- Policy: Only tenant admins can update their own branding
CREATE POLICY "Tenant admins can update branding" ON white_label_configs
    FOR UPDATE USING (auth.uid() IN (
        SELECT user_id FROM user_roles WHERE tenant_id = white_label_configs.tenant_id AND role = 'admin'
    ));

-- Example of how to structure OTHER tables for multi-tenancy
-- CREATE TABLE leads (
--     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--     tenant_id UUID NOT NULL REFERENCES tenants(id),
--     name TEXT,
--     ...
-- );

-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy for multi-tenancy: users only see records from their own tenant
-- CREATE POLICY "Tenant lead isolation" ON leads
--     FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- API Proxy & Usage Tracking
CREATE TABLE IF NOT EXISTS api_proxies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- 'gemini', 'hunter', etc.
    base_url TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID,
    api_name TEXT NOT NULL,
    endpoint TEXT,
    status_code INTEGER,
    response_time_ms INTEGER,
    credits_used INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can view their own usage" ON api_usage_logs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
