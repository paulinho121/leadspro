
-- ======================================================
-- SEGURANÇA NUCLEAR: ISOLAMENTO TOTAL DE DADOS
-- ======================================================

-- 1. LIMPEZA TOTAL DE POLÍTICAS ANTIGAS (Garante que nenhuma permissiva sobreviva)
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'leads') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON leads', pol.policyname);
    END LOOP;
END $$;

-- 2. NOVA POLÍTICA DE ISOLAMENTO ABSOLUTO
-- Esta política bloqueia qualquer acesso que não seja do próprio Tenant do usuário.
CREATE POLICY "Isolamento Estrito por Tenant" ON leads
    FOR ALL 
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- 3. POLÍTICA ESPECIAL PARA MASTER ADMIN (Paulo)
-- Permite que administradores com a flag is_master_admin vejam tudo
CREATE POLICY "Acesso Master Administrador" ON leads
    FOR ALL
    TO authenticated
    USING (
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 4. REFORÇO NA TABELA DE CONFIGURAÇÕES WHITE LABEL
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'white_label_configs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON white_label_configs', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "White Label: Ver Próprio ou Público" ON white_label_configs
    FOR SELECT 
    USING (true); -- Leitura pública necessária para o carregamento do branding antes do login

CREATE POLICY "White Label: Gerenciar Próprio" ON white_label_configs
    FOR ALL
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 5. SEGURANÇA NA TABELA DE USUÁRIOS
DO $$ 
DECLARE 
    pol record;
BEGIN 
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', pol.policyname);
    END LOOP;
END $$;

CREATE POLICY "Profiles: Ver Mesma Empresa" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        is_master_admin = true
    );

CREATE POLICY "Profiles: Atualizar Próprio" ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- NOTA: O Tenant '00000000-0000-0000-0000-000000000000' deve ser usado APENAS para demonstração
-- e nenhum usuário real deve permanecer nele após o setup inicial.
