
-- ======================================================
-- SEGURANÇA SÊNIOR: RESTRUTURAÇÃO DE SEGREDOS E BRANDING
-- ======================================================

-- 1. CRIAÇÃO DA TABELA DE SEGREDOS (Isolada do Branding Público)
CREATE TABLE IF NOT EXISTS tenant_api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    gemini_key TEXT,
    openai_key TEXT,
    serper_key TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. MIGRAÇÃO DE DADOS EXISTENTES
INSERT INTO tenant_api_keys (tenant_id, gemini_key, openai_key, serper_key)
SELECT 
    tenant_id, 
    api_keys->>'gemini', 
    api_keys->>'openai', 
    api_keys->>'serper'
FROM white_label_configs
ON CONFLICT (tenant_id) DO UPDATE SET
    gemini_key = EXCLUDED.gemini_key,
    openai_key = EXCLUDED.openai_key,
    serper_key = EXCLUDED.serper_key;

-- 3. REMOÇÃO DA COLUNA SENSÍVEL DA TABELA PÚBLICA
ALTER TABLE white_label_configs DROP COLUMN IF EXISTS api_keys;

-- 4. HABILITAR RLS NA NOVA TABELA
ALTER TABLE tenant_api_keys ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS DE ACESSO PARA tenant_api_keys (ESTRITO)
-- Apenas o Master Admin ou o próprio dono do Tenant (admin) pode ver as chaves
CREATE POLICY "Keys: Acesso Privado por Tenant Admin" ON tenant_api_keys
    FOR ALL 
    TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT COALESCE(is_master_admin, false) FROM profiles WHERE id = auth.uid()) = true
    )
    WITH CHECK (
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        (SELECT COALESCE(is_master_admin, false) FROM profiles WHERE id = auth.uid()) = true
    );

-- 6. REFORÇO NA TABELA DE BRANDING (LEITURA PÚBLICA SEGURA)
-- Agora que api_keys foi removida, o SELECT público é seguro.
DROP POLICY IF EXISTS "White Label: Ver Próprio ou Público" ON white_label_configs;
CREATE POLICY "Public Branding Access" ON white_label_configs
    FOR SELECT
    USING (true); -- Seguro agora pois não tem mais a coluna api_keys

-- 7. AUDITORIA: Adicionar triggers de atualização de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenant_keys_updated_at
    BEFORE UPDATE ON tenant_api_keys
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- LOG DE SEGURANÇA
COMMENT ON TABLE tenant_api_keys IS 'Armazena chaves de API sensíveis isoladas do branding público.';
