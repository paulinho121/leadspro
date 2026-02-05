
SELECT 
    trig.tgname AS trigger_name,
    rel.relname AS table_name,
    n.nspname AS schema_name,
    proc.proname AS function_name,
    obj_description(proc.oid, 'pg_proc') AS function_description
FROM pg_trigger trig
JOIN pg_class rel ON trig.tgrelid = rel.oid
JOIN pg_namespace n ON rel.relnamespace = n.oid
JOIN pg_proc proc ON trig.tgfoid = proc.oid
WHERE n.nspname = 'public' OR n.nspname = 'auth';
