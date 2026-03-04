-- =========================================================================
-- PARTE 1: ARQUITETURA DE TENANT DINÂMICO V2.0 (ISOLAMENTO MULTI-TENANT)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    v_name TEXT;
    v_slug TEXT;
BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nova Conta');
    
    -- Se for o Root Admin Paulo Fernando, vincule ao tenant original
    IF NEW.id = '1458e644-ed4e-4341-9b84-a3759c8c6534' THEN
        new_tenant_id := 'fc422ec0-470c-4910-8146-132d8d6ba80a';
        INSERT INTO public.tenants (id, name, slug) VALUES (new_tenant_id, 'Master Tenant', 'master-tenant') ON CONFLICT DO NOTHING;
    ELSE
        -- Gera um ID único para o novo tenant
        new_tenant_id := gen_random_uuid();
        -- Gera um slug simples baseado no timestamp para evitar colisoes e nulls em slugs
        v_slug := 'org-' || extract(epoch from now())::text || '-' || floor(random() * 1000)::text;
        
        -- Cria uma Organização NOVA Exclusiva e Isolada para o Cliente
        INSERT INTO public.tenants (id, name, slug) VALUES (new_tenant_id, v_name || ' (Org)', v_slug);
    END IF;

    -- Cria o Auth Profile Injetando a chave estrangeira do novo Tenant
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES (
        NEW.id,
        new_tenant_id,
        v_name,
        'admin' -- Dono exclusivo do próprio espaço
    ) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =========================================================================
-- PARTE 2: CORREÇÃO RETROATIVA DO VAZAMENTO DO FERNANDO LIMA E WALLET
-- =========================================================================
DO $$ 
DECLARE 
    fernando_tenant UUID;
    v_slug TEXT;
BEGIN
    -- Verifica se o Fernando (ou a outra conta de teste) caiu no tenant errado
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = '18091100-9d2d-484b-9a53-1689441146bb' 
        AND tenant_id = 'fc422ec0-470c-4910-8146-132d8d6ba80a'
    ) THEN
        -- 1. Cria a caixa selada (gerando o ID primeiro e um slug propenso a não dar conflito)
        fernando_tenant := gen_random_uuid();
        v_slug := 'org-fernando-' || floor(random() * 10000)::text;
        
        INSERT INTO public.tenants (id, name, slug) VALUES (fernando_tenant, 'Fernando Lima (Org Privada)', v_slug);
        
        -- 2. "Ejeta" o Fernando do master e tranca ele no seu banco particular
        UPDATE public.profiles 
        SET tenant_id = fernando_tenant, is_master_admin = false 
        WHERE id = '18091100-9d2d-484b-9a53-1689441146bb';
        
        -- 3. Cria carteira separada começando do zero bônus ($0 créditos)
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance, initial_credits_claimed)
        VALUES (fernando_tenant, 0, false)
        ON CONFLICT DO NOTHING;
    END IF;

    -- 4. Garantir que a tabela tenant_wallets tem as policies corretas para que o MESTRE veja seus 999999
    DROP POLICY IF EXISTS "wallet_leitura" ON public.tenant_wallets;
    CREATE POLICY "wallet_leitura" ON public.tenant_wallets
        FOR SELECT TO authenticated
        USING (
            tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
            OR (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
        );
END $$;

NOTIFY pgrst, 'reload schema';
