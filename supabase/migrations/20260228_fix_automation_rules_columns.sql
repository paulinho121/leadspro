-- ============================================================
-- FIX: Colunas faltando na tabela automation_rules
-- Erro: "Could not find the 'conditions' column"
-- ============================================================

-- Adiciona as colunas JSONB que faltam na automation_rules
ALTER TABLE automation_rules
    ADD COLUMN IF NOT EXISTS conditions    JSONB NOT NULL DEFAULT '{"intent": "positive"}'::jsonb,
    ADD COLUMN IF NOT EXISTS action_payload JSONB NOT NULL DEFAULT '{"template": ""}'::jsonb;

-- Garante que linhas antigas tenham valores válidos
UPDATE automation_rules
SET
    conditions     = '{"intent": "positive"}'::jsonb  WHERE conditions IS NULL,
    action_payload = '{"template": ""}'::jsonb          WHERE action_payload IS NULL;

-- Refresca o schema cache do Supabase (resolve o "schema cache" do PostgREST)
NOTIFY pgrst, 'reload schema';
