
-- FUNÇÃO DE RESGATE: Auditoria Global de Leads
CREATE OR REPLACE FUNCTION public.emergency_leads_census()
RETURNS TABLE(tenant_id UUID, leads_count BIGINT) 
LANGUAGE plpgsql
SECURITY DEFINER -- Permite ver tudo ignorando RLS
AS $$
BEGIN
    RETURN QUERY
    SELECT l.tenant_id, count(*) 
    FROM public.leads l
    GROUP BY l.tenant_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.emergency_leads_census() TO anon;
GRANT EXECUTE ON FUNCTION public.emergency_leads_census() TO authenticated;
