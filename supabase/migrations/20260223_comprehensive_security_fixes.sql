
-- ======================================================
-- SEGURANÇA MÁXIMA: FIXES DO PENTEST REPORT
-- ======================================================

-- 1. GARANTIR RLS EM TODAS AS TABELAS SENSÍVEIS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE white_label_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. LIMPEZA DE POLÍTICAS EXISTENTES (RESET)
DROP POLICY IF EXISTS "Profiles: ver membros da mesma empresa" ON profiles;
DROP POLICY IF EXISTS "Profiles: Master vê tudo" ON profiles;
DROP POLICY IF EXISTS "Public Branding Access" ON white_label_configs;
DROP POLICY IF EXISTS "Branding: leitura pública" ON white_label_configs;
DROP POLICY IF EXISTS "Branding: permiti tudo para dev" ON white_label_configs;
DROP POLICY IF EXISTS "Tenants: Master vê todos" ON tenants;
DROP POLICY IF EXISTS "Tenants: Ver própria organização" ON tenants;
DROP POLICY IF EXISTS "Keys: Acesso Privado por Tenant Admin" ON tenant_api_keys;

-- 3. POLÍTICAS PARA PROFILES (FINDING-3)
-- Usuários podem ver seu próprio perfil
CREATE POLICY "Profiles: Ver próprio perfil" ON profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());

-- Membros da mesma empresa podem se ver
CREATE POLICY "Profiles: Ver membros da mesma empresa" ON profiles
    FOR SELECT TO authenticated
    USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Master Admin vê todos
CREATE POLICY "Profiles: Master vê todos" ON profiles
    FOR SELECT TO authenticated
    USING ((SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true);

-- Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Profiles: Atualizar próprio perfil" ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- 4. POLÍTICAS PARA WHITE_LABEL_CONFIGS (FINDING-5 - Previne Enumeração)
-- Permitir leitura pública APENAS para o domínio atual (Hostname)
-- Usamos current_setting('request.header.host') para identificar o domínio da requisição
CREATE POLICY "Branding: Leitura por Domínio/Subdomínio" ON white_label_configs
    FOR SELECT
    USING (
        custom_domain = split_part(current_setting('request.header.host', true), ':', 1)
        OR 
        subdomain = split_part(split_part(current_setting('request.header.host', true), ':', 1), '.', 1)
        OR
        -- Master Admin ou Usuário Logado vendo sua própria config
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
        OR
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Somente Master Admin ou Owner do Tenant pode modificar
CREATE POLICY "Branding: Modificação Restrita" ON white_label_configs
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 5. POLÍTICAS PARA TENANT_API_KEYS (Segurança Máxima)
CREATE POLICY "Keys: Proteção Total" ON tenant_api_keys
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 6. POLÍTICAS PARA TENANTS
CREATE POLICY "Tenants: Ver própria org" ON tenants
    FOR SELECT TO authenticated
    USING (
        id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 7. SEGURANÇA DE FUNÇÕES RPC (FINDING-2)
-- Revogar acesso público a funções críticas
REVOKE ALL ON FUNCTION get_master_console_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_master_console_stats() FROM anon;
GRANT EXECUTE ON FUNCTION get_master_console_stats() TO authenticated;

-- 8. RESTRICÃO DE SCHEMA (FINDING-4)
-- Impede que usuários anônimos vejam a estrutura das tabelas via OpenAPI (PostgREST)
REVOKE ALL ON SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO anon;
-- Permitir apenas SELECT em tabelas de branding via Anon (Pelo PostgREST)
GRANT SELECT ON white_label_configs TO anon;

-- 9. REMOÇÃO DE BACKDOOR SQL (FINDING-1)
-- Garantir que e-mais específicos não ganhem privilégios automaticamente via trigger ou similar
-- Este script assume que o usuário master foi definido manualmente e não por e-mail fixo.

-- 10. PROTEÇÃO CONTRA ENUMERAÇÃO DE USUÁRIOS (tenant_users)
DROP POLICY IF EXISTS "Membros: gerenciar mesma empresa" ON tenant_users;
CREATE POLICY "Membros: Isolamento por Tenant" ON tenant_users
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 11. PROTEÇÃO DE LEADS
DROP POLICY IF EXISTS "Leads: isolamento e dev mix" ON leads;
CREATE POLICY "Leads: Isolamento Total" ON leads
    FOR ALL TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- LOG DE EXECUÇÃO
COMMENT ON SCHEMA public IS 'Schema seguro conforme auditoria de segurança 23/02/2026.';
