-- Adicionar colunas para tokens de CRM nativos
ALTER TABLE tenant_api_keys 
ADD COLUMN IF NOT EXISTS rd_station_token TEXT,
ADD COLUMN IF NOT EXISTS hubspot_token TEXT,
ADD COLUMN IF NOT EXISTS pipedrive_token TEXT,
ADD COLUMN IF NOT EXISTS salesforce_token TEXT;
