
-- Migration to add feature flags to White Label configuration
ALTER TABLE white_label_configs 
ADD COLUMN IF NOT EXISTS enabled_features JSONB DEFAULT '{
  "automation": true,
  "discovery": true,
  "lab": true,
  "pipeline": true,
  "billing": true,
  "enriched": true,
  "monitor": true,
  "leadAdmin": true
}'::jsonb;

-- Update existing records to have all features enabled by default if empty
UPDATE white_label_configs 
SET enabled_features = '{
  "automation": true,
  "discovery": true,
  "lab": true,
  "pipeline": true,
  "billing": true,
  "enriched": true,
  "monitor": true,
  "leadAdmin": true
}'::jsonb
WHERE enabled_features IS NULL;
