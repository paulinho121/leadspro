-- =========================================================================
-- GLOBAL API KEYS PROVIDER
-- Permite que usuários comuns usem as chaves do Master se não tiverem as suas
-- =========================================================================

CREATE OR REPLACE FUNCTION public.get_platform_api_keys()
RETURNS TABLE (
    gemini_key TEXT,
    openai_key TEXT,
    serper_key TEXT
) AS $$
DECLARE
    v_master_tenant_id UUID;
BEGIN
    -- 1. Localizar o Tenant ID do Master Admin
    SELECT tenant_id INTO v_master_tenant_id 
    FROM public.profiles 
    WHERE is_master_admin = true 
    LIMIT 1;

    -- Se não houver master configurado, retorna vazio
    IF v_master_tenant_id IS NULL THEN
        RETURN;
    END IF;

    -- 2. Retornar as chaves desse tenant específico
    -- Como a função é SECURITY DEFINER, ela ignora o RLS do usuário que chama
    RETURN QUERY 
    SELECT 
        k.gemini_key, 
        k.openai_key, 
        k.serper_key 
    FROM public.tenant_api_keys k 
    WHERE k.tenant_id = v_master_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Garantir que apenas usuários logados possam executar
REVOKE ALL ON FUNCTION public.get_platform_api_keys() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_platform_api_keys() TO authenticated;
