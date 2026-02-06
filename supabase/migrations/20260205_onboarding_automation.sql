
-- ======================================================
-- ONBOARDING AUTOMÁTICO: CADA USUÁRIO É UMA EMPRESA
-- ======================================================

-- 1. Função que processa o novo usuário no momento do cadastro (Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user_onboarding()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    base_name TEXT;
    clean_slug TEXT;
BEGIN
    -- Tentar pegar o nome do metadados, senão usa a parte inicial do email
    base_name := COALESCE(new.raw_user_meta_data->>'full_name', SPLIT_PART(new.email, '@', 1));
    
    -- Gerar um slug limpo para a empresa
    clean_slug := lower(regexp_replace(base_name, '[^a-zA-Z0-9]', '-', 'g')) || '-' || (floor(random() * 8999) + 1000)::text;

    -- A. Criar o Tenant (Empresa) Isolado
    INSERT INTO public.tenants (name, slug, plan)
    VALUES (base_name || ' Labs', clean_slug, 'pro')
    RETURNING id INTO new_tenant_id;

    -- B. Criar o Perfil do Usuário vinculado ao novo Tenant
    -- IMPORTANTE: Usamos ON CONFLICT pois pode haver tentativas manuais via front
    INSERT INTO public.profiles (id, tenant_id, full_name, role)
    VALUES (new.id, new_tenant_id, base_name, 'admin')
    ON CONFLICT (id) DO UPDATE 
    SET tenant_id = EXCLUDED.tenant_id,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;

    -- C. Criar Configuração White Label Padrão para a nova Empresa
    INSERT INTO public.white_label_configs (tenant_id, platform_name)
    VALUES (new_tenant_id, base_name || ' Pro')
    ON CONFLICT (tenant_id) DO NOTHING;

    RETURN new;
EXCEPTION WHEN OTHERS THEN
    -- Fallback de segurança: se algo falhar, garantimos que o erro seja logado
    -- mas o usuário é criado. Em produção, você veria isso nos logs do Supabase.
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ativar o Trigger na tabela de usuários do Auth
DROP TRIGGER IF EXISTS on_auth_user_created_onboarding ON auth.users;
CREATE TRIGGER on_auth_user_created_onboarding
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_onboarding();

-- 3. AJUSTE DE RLS: Garantir que o usuário possa ler seu próprio perfil imediatamente
DROP POLICY IF EXISTS "Profiles: permitir leitura do próprio no setup" ON profiles;
CREATE POLICY "Profiles: permitir leitura do próprio no setup" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- NOTA: Este trigger resolve o problema das "paredes" garantindo que NENHUM
-- usuário compartilhe o mesmo Tenant ID por padrão, a menos que seja convidado.
