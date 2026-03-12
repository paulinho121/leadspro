
-- Migration to fix RLS for communication_settings in the Master Console
-- This drops legacy policies and creates a single robust one for Master and Tenants.

-- 1. Drop all legacy policies
DROP POLICY IF EXISTS "Tenants can manage their own settings" ON public.communication_settings;
DROP POLICY IF EXISTS "Comm Settings: isolation" ON public.communication_settings;
DROP POLICY IF EXISTS "communication_settings_rls_policy" ON public.communication_settings;

-- 2. Create the unified policy
CREATE POLICY "communication_settings_unified_policy"
    ON public.communication_settings
    FOR ALL
    USING (
        -- User is the Master Admin
        (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true
        OR
        -- User belongs to the same tenant as the settings
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR
        -- Master Tenant (0000...0000) can be managed by any authenticated admin for now
        (tenant_id = '00000000-0000-0000-0000-000000000000' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'gerente' OR is_master_admin = true)
        ))
    )
    WITH CHECK (
        (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true
        OR
        tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        OR
        (tenant_id = '00000000-0000-0000-0000-000000000000' AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND (role = 'admin' OR role = 'gerente' OR is_master_admin = true)
        ))
    );

-- 3. Ensure Paulo Fernando is Master if he exists
UPDATE public.profiles 
SET is_master_admin = true 
WHERE id = '3a760c29-accb-47e0-9b31-be35cb7e156f';
