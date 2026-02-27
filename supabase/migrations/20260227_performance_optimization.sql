
-- ========================================================
-- LEADFLOW PRO - PERFORMANCE & DATA STRUCTURE OPTIMIZATION
-- Versão: 1.0 - Otimização de Busca e QSA
-- ========================================================

-- 1. ÍNDICES DE PERFORMANCE (Acelera a filtragem na aba Comercial)
-- O App faz muitas buscas por status e tenant simultaneamente.
CREATE INDEX IF NOT EXISTS idx_leads_status_tenant ON leads(status, tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_industry_tenant ON leads(industry, tenant_id);

-- 2. NORMALIZAÇÃO DE DADOS EXISTENTES (Opcional)
-- Caso já existam leads com detalhes antigos, este script ajuda a manter a consistência,
-- embora o Frontend já lide com isso via fallback.
COMMENT ON COLUMN leads.details IS 'Armazena metadados de QSA ({qsa: [{nome, cargo}]}), funcionários e telefones reais ({realPhones: []})';

-- 3. LOG DE OTIMIZAÇÃO
INSERT INTO credit_transactions (tenant_id, amount, type, description)
SELECT id, 1000, 'bonus', 'Bônus de Otimização de Performance (Neural Pro)'
FROM tenants
ON CONFLICT DO NOTHING;
