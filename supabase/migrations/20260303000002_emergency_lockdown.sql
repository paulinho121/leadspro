
-- ======================================================
-- LEADFLOW PRO - EMERGENCY LOCKDOWN (ANTI-HACKER)
-- Bloqueia o sistema para todos, exceto o Master Admin
-- ======================================================

-- 1. Desativar acesso anônimo ao schema public completamente
REVOKE USAGE ON SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- 2. BLOQUEIO TOTAL VIA RLS (Maintenance Mode Implícito)
-- Apenas o usuário is_master_admin poderá ver dados.

-- Perfis
DROP POLICY IF EXISTS "Profiles: Isolamento Tenant" ON public.profiles;
CREATE POLICY "Lockdown: Apenas Master" ON public.profiles
    FOR ALL TO authenticated
    USING ( (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- Leads
DROP POLICY IF EXISTS "Leads: Isolamento Total (No Backdoor)" ON public.leads;
DROP POLICY IF EXISTS "Leads: isolamento e dev mix" ON public.leads;
CREATE POLICY "Lockdown: AEP Leads" ON public.leads
    FOR ALL TO authenticated
    USING ( (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- Wallets
DROP POLICY IF EXISTS "Wallets: Isolamento Tenant" ON public.tenant_wallets;
CREATE POLICY "Lockdown: AEP Wallets" ON public.tenant_wallets
    FOR ALL TO authenticated
    USING ( (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- Transactions
DROP POLICY IF EXISTS "Transactions: Isolamento Tenant" ON public.credit_transactions;
CREATE POLICY "Lockdown: AEP Transactions" ON public.credit_transactions
    FOR ALL TO authenticated
    USING ( (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid()) = true );

-- 3. REVOGAR EXECUÇÃO DE FUNÇÕES SENSÍVEIS
-- Se o hacker estiver chamando RPCs, isso vai parar ele.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Abrir exceção APENAS para funções de leitura de Branding (senão o site nem abre)
-- mas garantindo que o Branding não vaze dados.
GRANT EXECUTE ON FUNCTION public.get_auth_tenant() TO authenticated;

-- 4. BANIR O HACKER (Se soubermos o ID ou IP)
-- Por enquanto, o bloqueio Master-Only já resolve.

COMMENT ON SCHEMA public IS 'EMERGENCY LOCKDOWN ATIVE - Apenas Master Admin acessa.';
