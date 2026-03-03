
CREATE OR REPLACE FUNCTION public.check_all_functions()
RETURNS TABLE(fn_name TEXT, fn_def TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER 
AS $$
BEGIN
    RETURN QUERY
    SELECT routine_name::text, routine_definition::text
    FROM information_schema.routines
    WHERE routine_schema = 'public';
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_all_functions() TO anon;
