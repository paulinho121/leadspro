
-- RESET DE BRANDING PADRÃO (Tenant 0000...)
-- Execute este comando para remover a logo/configurações do cliente que ficaram salvas no tenant default

UPDATE white_label_configs 
SET 
    platform_name = 'LeadFlow Pro',
    logo_url = NULL,
    favicon_url = NULL,
    primary_color = '#06b6d4',
    secondary_color = '#3b82f6',
    api_keys = '{
        "gemini": null,
        "openai": null,
        "deepseek": null,
        "serper": null
    }'::jsonb
WHERE tenant_id = '00000000-0000-0000-0000-000000000000';

-- Garantir que o nome da plataforma no Bootstrap também seja resetado
UPDATE tenants 
SET name = 'LeadFlow Principal'
WHERE id = '00000000-0000-0000-0000-000000000000';
