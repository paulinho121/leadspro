-- Atualize o nome da sua empresa (Tenant) e o Nome da Plataforma

UPDATE public.tenants
SET name = 'Paulo Fernando Automação' 
WHERE name = 'Paulo Fernando Labs' OR name = 'John Wayne Labs';

UPDATE public.white_label_configs
SET platform_name = 'LeadMatrix'
WHERE tenant_id IN (
  SELECT id FROM public.tenants 
  WHERE name = 'Paulo Fernando Automação'
);

-- Caso queira mudar também no perfil do usuário
UPDATE public.profiles
SET full_name = 'Paulo Fernando'
WHERE full_name = 'John Wayne';
