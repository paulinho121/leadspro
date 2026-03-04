-- Corrige a tabela leads e api_usage_logs definindo o UUID auto-gerado se não vier preenchido
ALTER TABLE public.leads 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- A mesma proteção para o api_usage_logs
ALTER TABLE public.api_usage_logs 
    ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Recarregar cache de esquema do Supabase
NOTIFY pgrst, 'reload schema';
