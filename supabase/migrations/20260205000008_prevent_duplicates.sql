
-- 1. ADICIONAR CONSTRAINT DE UNICIDADE PARA EVITAR DUPLICATAS
-- Consideramos um lead duplicado se tiver o mesmo nome, cidade e pertencer ao mesmo tenant
-- Isso garante o "não se repitam" a nível de banco de dados
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_unique_tenant_name_location;
ALTER TABLE leads ADD CONSTRAINT leads_unique_tenant_name_location UNIQUE (tenant_id, name, location);

-- 2. LIMPEZA DE DUPLICATAS EXISTENTES (OPCIONAL MAS RECOMENDADO)
-- Remove leads mais antigos que tenham o mesmo nome e localização para o mesmo tenant
DELETE FROM leads a USING leads b
WHERE a.id < b.id 
AND a.tenant_id = b.tenant_id 
AND a.name = b.name 
AND a.location = b.location;
