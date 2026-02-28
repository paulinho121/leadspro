-- ============================================================
-- HABILITAR SUPABASE REALTIME
-- Necessário para atualizações ao vivo no Painel de Disparos
-- ============================================================

-- 1. Habilita Realtime nas tabelas de campanhas e fila de mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE outreach_campaigns;
ALTER PUBLICATION supabase_realtime ADD TABLE message_queue;

-- 2. (Opcional mas recomendado) Garante que processed_leads seja atualizado
--    pelo banco quando a message_queue muda — via trigger automático.
--    Isso evita depender só da contagem incremental do frontend.

CREATE OR REPLACE FUNCTION update_campaign_progress()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcula processed_leads a partir dos itens realmente processados na fila
    UPDATE outreach_campaigns
    SET
        processed_leads = (
            SELECT COUNT(*)
            FROM message_queue
            WHERE campaign_id = NEW.campaign_id
              AND status IN ('sent', 'failed')
        ),
        -- Marca como completed automaticamente quando todos foram processados
        status = CASE
            WHEN (
                SELECT COUNT(*)
                FROM message_queue
                WHERE campaign_id = NEW.campaign_id
                  AND status IN ('sent', 'failed')
            ) >= COALESCE(total_leads, 1)
            AND status = 'running'
            THEN 'completed'
            ELSE status
        END
    WHERE id = NEW.campaign_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS trg_update_campaign_progress ON message_queue;

-- Cria trigger que dispara toda vez que uma mensagem é enviada ou falha
CREATE TRIGGER trg_update_campaign_progress
    AFTER UPDATE OF status ON message_queue
    FOR EACH ROW
    WHEN (NEW.status IN ('sent', 'failed') AND OLD.status != NEW.status)
    EXECUTE FUNCTION update_campaign_progress();

-- ============================================================
-- VERIFICAÇÃO (rode depois para confirmar):
-- SELECT schemaname, tablename FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
-- ============================================================
