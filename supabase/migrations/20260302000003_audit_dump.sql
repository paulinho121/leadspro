-- ======================================================
-- SECURITY AUDIT: DUMP DATABASE STATE
-- ======================================================

CREATE OR REPLACE FUNCTION public.dump_system_state()
RETURNS JSONB AS $$
DECLARE
    v_profiles JSONB;
    v_tenants JSONB;
BEGIN
    SELECT jsonb_agg(p) INTO v_profiles FROM (SELECT * FROM public.profiles) p;
    SELECT jsonb_agg(t) INTO v_tenants FROM (SELECT * FROM public.tenants) t;
    
    RETURN jsonb_build_object(
        'profiles', v_profiles,
        'tenants', v_tenants
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.dump_system_state() TO authenticated;
