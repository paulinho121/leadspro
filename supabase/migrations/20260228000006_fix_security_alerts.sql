-- ============================================================
-- LEADFLOW PRO — FIX SECURITY ALERTS (Supabase Advisor)
-- 1. RLS na tabela worker_health (estava desabilitado)
-- 2. Recriar v_automation_health com SECURITY INVOKER
-- ============================================================

-- ================================================================
-- CORREÇÃO 1: worker_health — Habilitar RLS
-- ================================================================
-- A tabela é de sistema (heartbeat do worker), mas o Supabase exige
-- RLS em todas as tabelas públicas. A estratégia é:
--   • service_role (worker backend) → acesso total sem restrição de RLS
--   • Usuários autenticados → podem LER (para o dashboard de saúde)
--   • Nenhum usuário pode INSERT/UPDATE/DELETE via client (apenas service_role)

ALTER TABLE public.worker_health ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "worker_health: read by authenticated" ON public.worker_health;
DROP POLICY IF EXISTS "worker_health: service_role full access" ON public.worker_health;

-- Leitura pública para usuários autenticados (dashboard de monitoramento)
CREATE POLICY "worker_health: read by authenticated"
    ON public.worker_health
    FOR SELECT
    TO authenticated
    USING (true);

-- Escrita restrita ao service_role (o worker usa a chave service_role)
-- O service_role bypassa RLS por padrão no Supabase, então não precisa
-- de policy explícita para ele. Esta policy bloqueia INSERT/UPDATE/DELETE
-- de roles autenticados normais.
-- Nenhuma policy de escrita para `authenticated` = bloqueado por padrão.

-- ================================================================
-- CORREÇÃO 2: v_automation_health — Recriar com SECURITY INVOKER
-- ================================================================
-- SECURITY DEFINER faz a view rodar com privilégios do criador (postgres),
-- podendo expor dados de outros tenants. SECURITY INVOKER garante que
-- a view respeitará as permissões e RLS do usuário que está consultando.

DROP VIEW IF EXISTS public.v_automation_health;

CREATE OR REPLACE VIEW public.v_automation_health
WITH (security_invoker = true)  -- Respeita RLS do usuário chamador
AS
SELECT
    t.id AS tenant_id,
    -- Fila atual
    COUNT(mq.id) FILTER (WHERE mq.status = 'pending')                                                    AS queue_pending,
    COUNT(mq.id) FILTER (WHERE mq.status = 'processing')                                                 AS queue_processing,
    COUNT(mq.id) FILTER (WHERE mq.status = 'sent'   AND mq.sent_at    > NOW() - INTERVAL '24 hours')    AS sent_last_24h,
    COUNT(mq.id) FILTER (WHERE mq.status = 'failed' AND mq.created_at > NOW() - INTERVAL '24 hours')    AS failed_last_24h,
    -- Campanhas ativas
    COUNT(DISTINCT oc.id) FILTER (WHERE oc.status = 'running')                                           AS active_campaigns,
    -- Cadências ativas
    COUNT(DISTINCT se.id) FILTER (WHERE se.status = 'active')                                            AS active_sequences,
    -- Taxa de entrega (últimos 7 dias)
    CASE
        WHEN COUNT(mq.id) FILTER (WHERE mq.status IN ('sent', 'failed') AND mq.created_at > NOW() - INTERVAL '7 days') > 0
        THEN ROUND(
            COUNT(mq.id) FILTER (WHERE mq.status = 'sent'   AND mq.created_at > NOW() - INTERVAL '7 days')::numeric /
            COUNT(mq.id) FILTER (WHERE mq.status IN ('sent', 'failed') AND mq.created_at > NOW() - INTERVAL '7 days')::numeric * 100,
            1
        )
        ELSE 0
    END AS delivery_rate_7d
FROM public.tenants t
LEFT JOIN public.message_queue        mq ON mq.tenant_id = t.id
LEFT JOIN public.outreach_campaigns   oc ON oc.tenant_id = t.id
LEFT JOIN public.sequence_enrollments se ON se.tenant_id = t.id
GROUP BY t.id;

COMMENT ON VIEW public.v_automation_health IS
    'Métricas de saúde do motor de automação por tenant — SECURITY INVOKER (respeita RLS do caller)';

-- ================================================================
-- VERIFICAÇÃO: garantir que as tabelas subjacentes têm RLS ativo
-- (message_queue, outreach_campaigns, sequence_enrollments, tenants)
-- Isso é necessário para que a view SECURITY INVOKER filtre corretamente.
-- ================================================================
DO $$
BEGIN
    -- Apenas emite um aviso se alguma tabela subjacente não tiver RLS
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'message_queue'
          AND c.relrowsecurity = true
    ) THEN
        RAISE WARNING 'message_queue não tem RLS ativo — v_automation_health pode retornar dados de todos os tenants!';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname = 'tenants'
          AND c.relrowsecurity = true
    ) THEN
        RAISE WARNING 'tenants não tem RLS ativo — v_automation_health pode vazar dados!';
    END IF;
END $$;
