-- 1. Nova Function que assegura Injeção Dinâmica de TenantId
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    v_name TEXT;
BEGIN
    v_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nova Conta');
    
    -- Exceção apenas para o usuário Master Root
    IF NEW.id = '1458e644-ed4e-4341-9b84-a3759c8c6534' THEN
        new_tenant_id := 'fc422ec0-470c-4910-8146-132d8d6ba80a';
        -- Assegura que o tenant existe se rodado do zero
        INSERT INTO public.tenants (id, name) VALUES (new_tenant_id, 'Master Tenant') ON CONFLICT DO NOTHING;
    ELSE
        -- Cria um novo Tenant Org exclusivo para qualquer outro usuário novo
        INSERT INTO public.tenants (name) 
        VALUES (v_name || ' (Org)') 
        RETURNING id INTO new_tenant_id;
    END IF;

    -- Atribui o UUID do tenant certo
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES (
        NEW.id,
        new_tenant_id,
        v_name,
        'admin'  -- Cada pessoa é admin do seu próprio tenant
    ) ON CONFLICT (id) DO UPDATE SET tenant_id = EXCLUDED.tenant_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Corrigindo o vazamento retroativo do usuário Fernando Lima
DO $$ 
DECLARE 
    fernando_tenant UUID;
BEGIN
    -- Se o Fernando já existe
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = '18091100-9d2d-484b-9a53-1689441146bb') THEN
        
        -- Verificar se o tenant dele ainda é o do Master
        IF EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = '18091100-9d2d-484b-9a53-1689441146bb' 
            AND tenant_id = 'fc422ec0-470c-4910-8146-132d8d6ba80a'
        ) THEN
            -- Cria o isolamento
            INSERT INTO public.tenants (name) VALUES ('Fernando Lima (Org)') RETURNING id INTO fernando_tenant;
            
            -- Move ele para fora do escopo do master
            UPDATE public.profiles 
            SET tenant_id = fernando_tenant 
            WHERE id = '18091100-9d2d-484b-9a53-1689441146bb';
            
            -- Cria a carteira isolada
            INSERT INTO public.tenant_wallets (tenant_id, credit_balance, initial_credits_claimed)
            VALUES (fernando_tenant, 0, false)
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END $$;
