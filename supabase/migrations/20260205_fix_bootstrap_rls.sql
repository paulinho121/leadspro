-- ==========================================
-- FIX BOOTSTRAP PERMISSIONS
-- ==========================================

-- 1. Allow public or anonymous users to insert into tenants (essential for 'Lead Demo' creation)
DROP POLICY IF EXISTS "Enable insert for bootstrap" ON tenants;
CREATE POLICY "Enable insert for bootstrap" ON tenants
    FOR INSERT 
    WITH CHECK (true);

-- 2. Allow reading tenants if you know the ID (or public for dev)
DROP POLICY IF EXISTS "Enable read for bootstrap" ON tenants;
CREATE POLICY "Enable read for bootstrap" ON tenants
    FOR SELECT 
    USING (true);

-- 3. Fix potential issue with users being linked to 'default' but RLS blocking writes
-- (Already handled by previous migrations, but reinforcing)
DROP POLICY IF EXISTS "Allow updates for demo tenant" ON leads;
CREATE POLICY "Allow updates for demo tenant" ON leads
    FOR ALL
    USING (tenant_id = '00000000-0000-0000-0000-000000000000' OR tenant_id = get_auth_tenant());

-- 4. Enable insert/select on white_label_configs for bootstrap
DROP POLICY IF EXISTS "Bootstrap white_label_configs" ON white_label_configs;
CREATE POLICY "Bootstrap white_label_configs" ON white_label_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);
