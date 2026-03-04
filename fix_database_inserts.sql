-- =========================================================================
-- PARTE 1: CORREÇÃO DA TABELA DE LEADS (Erro: null value in column "id")
-- =========================================================================
-- Garante que todo novo lead receba um ID automático caso o frontend não envie
ALTER TABLE public.leads 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();


-- =========================================================================
-- PARTE 2: CRIAÇÃO DA TABELA API_USAGE_LOGS (Erro: 403 / Missing Table)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    service TEXT NOT NULL,         -- ex: 'maps', 'search'
    endpoint TEXT,                 -- url ou rota
    status_code INTEGER,           -- 200, 400, etc
    response_time_ms INTEGER,      
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e criar Policy para Log de API
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "api_usage_logs_inserir" ON public.api_usage_logs;
CREATE POLICY "api_usage_logs_inserir" ON public.api_usage_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        OR (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    );

DROP POLICY IF EXISTS "api_usage_logs_ler" ON public.api_usage_logs;
CREATE POLICY "api_usage_logs_ler" ON public.api_usage_logs
    FOR SELECT TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        OR (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    );

-- Recarregar cache de esquema do Supabase
NOTIFY pgrst, 'reload schema';
