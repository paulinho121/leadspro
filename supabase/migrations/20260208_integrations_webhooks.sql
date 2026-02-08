
-- 1. Tabela de Webhooks para Integração
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT 'lead.enriched', -- 'lead.created', 'lead.enriched', etc.
    secret_token TEXT, -- Para validação no lado do receptor
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (Isolamento por Tenant)
CREATE POLICY "Webhooks: isolamento por tenant" ON public.webhooks
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON public.webhooks(tenant_id);

-- 5. Logs de Execução de Webhooks (Opcional, mas útil para debug)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE,
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Webhook Logs: isolamento por tenant" ON public.webhook_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.webhooks 
            WHERE id = webhook_id AND (tenant_id = public.get_auth_tenant() OR public.check_is_master())
        )
    );
