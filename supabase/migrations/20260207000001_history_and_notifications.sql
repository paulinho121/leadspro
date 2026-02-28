
-- ======================================================
-- HISTÓRICO E NOTIFICAÇÕES: INFRAESTRUTURA DE COMUNICAÇÃO
-- ======================================================

-- 1. Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Null se for para todos da empresa
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'error', 'billing'
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de Histórico de Atividades (Logs de Auditoria)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'LEAD_CAPTURE', 'LEAD_ENRICH', 'LOGIN', etc.
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Isolamento por Tenant)

-- Notificações
CREATE POLICY "Notificações: isolamento por tenant" ON public.notifications
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());

-- Atividades
CREATE POLICY "Atividades: isolamento por tenant" ON public.activity_logs
    FOR ALL TO authenticated
    USING (tenant_id = public.get_auth_tenant() OR public.check_is_master())
    WITH CHECK (tenant_id = public.get_auth_tenant() OR public.check_is_master());

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_tenant ON public.activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at DESC);
