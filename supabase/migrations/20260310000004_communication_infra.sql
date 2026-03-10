-- Migração para suporte a múltiplos provedores de comunicação (WhatsApp/Email)
CREATE TABLE IF NOT EXISTS public.communication_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    provider_type TEXT NOT NULL, -- 'whatsapp_evolution', 'whatsapp_zapi', 'whatsapp_cloud_api', 'email_resend', etc.
    api_url TEXT,
    api_key TEXT,
    instance_name TEXT,
    client_token TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(tenant_id, provider_type)
);

-- Habilitar RLS
ALTER TABLE public.communication_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso
CREATE POLICY "Tenants can manage their own settings"
    ON public.communication_settings
    FOR ALL
    USING (tenant_id = auth.uid() OR tenant_id IN (
        SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    ));

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_comm_settings_tenant ON public.communication_settings(tenant_id);
