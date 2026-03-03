-- ======================================================
-- SECURITY AUDIT: LOCALIZAR E ELIMINAR TENANT DO INVASOR
-- ======================================================

CREATE OR REPLACE FUNCTION public.find_and_kill_intruder_tenant()
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_results JSONB;
BEGIN
    -- 1. Localizar o tenant "Fx Labs" ou similar
    SELECT id INTO v_tenant_id FROM public.tenants 
    WHERE name ILIKE '%Fx Labs%' OR slug ILIKE '%fx-%' OR slug ILIKE '%f-x-%'
    LIMIT 1;

    IF v_tenant_id IS NOT NULL THEN
        -- Capturar dados para o log antes de deletar
        v_results := jsonb_build_object(
            'found', true,
            'tenant_id', v_tenant_id,
            'action', 'DELETING_TENANT_AND_DATA'
        );

        -- 2. Deletar dados vinculados (Prevenindo que ele reapareça em cache/listas)
        DELETE FROM public.white_label_configs WHERE tenant_id = v_tenant_id;
        DELETE FROM public.tenant_wallets WHERE tenant_id = v_tenant_id;
        DELETE FROM public.leads WHERE tenant_id = v_tenant_id;
        DELETE FROM public.api_usage_logs WHERE tenant_id = v_tenant_id;
        DELETE FROM public.activity_logs WHERE tenant_id = v_tenant_id;
        
        -- 3. Deletar o Tenant em si
        DELETE FROM public.tenants WHERE id = v_tenant_id;
        
        RETURN v_results;
    ELSE
        RETURN jsonb_build_object('found', false, 'message', 'Nenhum tenant Fx Labs encontrado.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.find_and_kill_intruder_tenant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.find_and_kill_intruder_tenant() TO anon;
