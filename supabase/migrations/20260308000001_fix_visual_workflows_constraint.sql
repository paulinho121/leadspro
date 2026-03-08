
-- Adicionar restrição única para permitir upsert por nome e tenant
ALTER TABLE visual_workflows 
DROP CONSTRAINT IF EXISTS visual_workflows_tenant_name_key;

ALTER TABLE visual_workflows 
ADD CONSTRAINT visual_workflows_tenant_name_key UNIQUE (tenant_id, name);
