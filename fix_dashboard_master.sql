-- =============== CORREÇÃO DO MASTER CONSOLE (RLS) ===============
-- Este script libera o banco de dados para a conta "Master"
-- poder ler todas as empresas (tenants), leads e faturamentos

CREATE OR REPLACE FUNCTION public.check_is_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_master_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Libera para o Master ver todas as EMPRESAS
DROP POLICY IF EXISTS "master_admin_tenants" ON public.tenants;
CREATE POLICY "master_admin_tenants" ON public.tenants
FOR ALL USING (public.check_is_master() = true);

-- 2. Libera para o Master ver todos os USUÁRIOS (Profiles)
DROP POLICY IF EXISTS "master_admin_profiles" ON public.profiles;
CREATE POLICY "master_admin_profiles" ON public.profiles
FOR ALL USING (public.check_is_master() = true);

-- 3. Libera para o Master ver o CAIXA de todos os tenants (Wallet)
DROP POLICY IF EXISTS "master_admin_wallets" ON public.tenant_wallets;
CREATE POLICY "master_admin_wallets" ON public.tenant_wallets
FOR ALL USING (public.check_is_master() = true);

-- 4. Libera para o Master ver os LEADS para a tabela
DROP POLICY IF EXISTS "master_admin_leads" ON public.leads;
CREATE POLICY "master_admin_leads" ON public.leads
FOR ALL USING (public.check_is_master() = true);
