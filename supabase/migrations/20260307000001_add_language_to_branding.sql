
-- Adicionar coluna de idioma às configurações de White Label
ALTER TABLE white_label_configs ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'pt';
COMMENT ON COLUMN white_label_configs.language IS 'Idioma padrão da interface para este tenant (pt, en, es)';
