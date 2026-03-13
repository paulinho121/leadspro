-- ========================================================
-- LEADPRO - SETUP DE DADOS DE TESTE
-- Script para criar tenant, wallet e créditos de teste
-- ========================================================

-- 1. Criar tenant de teste (se não existir)
INSERT INTO tenants (
    id, 
    name, 
    slug, 
    plan, 
    created_at, 
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Test Tenant',
    'test-tenant',
    'pro',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Criar profile associado (se não existir)
INSERT INTO profiles (
    id,
    email,
    tenant_id,
    role,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'test@leadpro.com',
    '550e8400-e29b-41d4-a716-446655440000',
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 3. Criar wallet com créditos (se não existir)
INSERT INTO tenant_wallets (
    tenant_id,
    credit_balance,
    auto_recharge_enabled,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    10000, -- 10.000 créditos
    true,
    NOW()
) ON CONFLICT (tenant_id) DO UPDATE SET 
    credit_balance = GREATEST(tenant_wallets.credit_balance, 10000),
    updated_at = NOW();

-- 4. Adicionar algumas transações de exemplo
INSERT INTO credit_transactions (
    tenant_id,
    amount,
    type,
    service_name,
    description,
    created_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 10000, 'purchase', 'stripe', 'Créditos iniciais', NOW()),
    ('550e8400-e29b-41d4-a716-446655440000', -50, 'usage', 'gemini', 'Teste de enriquecimento', NOW())
ON CONFLICT DO NOTHING;

-- 5. Criar alguns leads de teste
INSERT INTO leads (
    id,
    name,
    status,
    location,
    industry,
    website,
    tenant_id,
    created_at,
    updated_at
) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'Empresa Teste 1', 'new', 'São Paulo, SP', 'Tecnologia', 'https://empresa1.com.br', '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440002', 'Empresa Teste 2', 'new', 'Rio de Janeiro, RJ', 'Serviços', 'https://empresa2.com.br', '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW()),
    ('550e8400-e29b-41d4-a716-446655440003', 'Empresa Teste 3', 'enriched', 'Belo Horizonte, MG', 'Comércio', 'https://empresa3.com.br', '550e8400-e29b-41d4-a716-446655440000', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 6. Verificar os dados criados
SELECT 'TENANTS' as tabela, COUNT(*) as total FROM tenants
UNION ALL
SELECT 'WALLETS', COUNT(*) FROM tenant_wallets
UNION ALL
SELECT 'PROFILES', COUNT(*) FROM profiles
UNION ALL
SELECT 'TRANSACTIONS', COUNT(*) FROM credit_transactions
UNION ALL
SELECT 'LEADS', COUNT(*) FROM leads;

-- 7. Mostrar saldo do tenant de teste
SELECT 
    t.name as tenant_name,
    tw.credit_balance,
    tw.auto_recharge_enabled,
    tw.updated_at
FROM tenants t
JOIN tenant_wallets tw ON t.id = tw.tenant_id
WHERE t.id = '550e8400-e29b-41d4-a716-446655440000';

-- 8. Mostrar leads criados
SELECT 
    name,
    status,
    location,
    industry,
    website
FROM leads 
WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY created_at DESC;

-- ========================================================
-- RESULTADO ESPERADO:
-- - Tenant criado com ID: 550e8400-e29b-41d4-a716-446655440000
-- - Wallet com 10.000 créditos
-- - Profile de admin associado
-- - 3 leads de teste
-- - Transações de exemplo
-- ========================================================
