import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://cqwhmzvytebrwpokkhdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd2htenZ5dGVicndwb2traGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQxMTEsImV4cCI6MjA4ODE0MDExMX0.cgWsc-4YTp5SAMb33aUiQf9FYY8WY64oJCsbK4EKhck';

console.log('🔍 Testando conexão com Supabase...');
console.log('📡 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Verificar se consegue conectar
    console.log('\n📋 Teste 1: Conexão básica');
    const { data, error } = await supabase
      .from('tenant_wallets')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Erro na conexão:', error);
      return false;
    }

    console.log('✅ Conexão bem-sucedida!');

    // Test 2: Listar todas as carteiras
    console.log('\n📋 Teste 2: Listar carteiras');
    const { data: wallets, error: walletsError } = await supabase
      .from('tenant_wallets')
      .select('*');

    if (walletsError) {
      console.error('❌ Erro ao listar carteiras:', walletsError);
      return false;
    }

    console.log('📊 Carteiras encontradas:', wallets.length);
    if (wallets.length > 0) {
      console.table(wallets);
    } else {
      console.log('⚠️ Nenhuma carteira encontrada');
    }

    // Test 3: Verificar tabela de tenants
    console.log('\n📋 Teste 3: Listar tenants');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*')
      .limit(5);

    if (tenantsError) {
      console.error('❌ Erro ao listar tenants:', tenantsError);
    } else {
      console.log('👥 Tenants encontrados:', tenants.length);
      if (tenants.length > 0) {
        console.table(tenants);
      }
    }

    // Test 4: Verificar se tem algum tenant_id específico
    console.log('\n📋 Teste 4: Buscar tenant específico');
    const { data: specificWallet, error: specificError } = await supabase
      .from('tenant_wallets')
      .select('*')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440000')
      .maybeSingle();

    if (specificError) {
      console.error('❌ Erro ao buscar tenant específico:', specificError);
    } else {
      console.log('🎯 Tenant específico:', specificWallet);
    }

    return true;

  } catch (err) {
    console.error('❌ Erro geral:', err);
    return false;
  }
}

// Testar função de getBalance
async function testGetBalance() {
  console.log('\n📋 Teste 5: Simular getBalance');
  
  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  console.log('🔍 Buscando saldo para tenant:', tenantId);

  if (!tenantId || tenantId === 'default') {
    console.log('⚠️ tenantId inválido ou default, retornando 0');
    return 0;
  }

  console.log('🔍 Buscando saldo...');

  const { data, error } = await supabase
    .from('tenant_wallets')
    .select('credit_balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  console.log('📊 Resultado da query:', { data, error });

  if (error) {
    console.error('❌ Erro ao buscar saldo:', error);
    return 0;
  }

  if (!data) {
    console.warn('⚠️ Nenhuma carteira encontrada para o tenant.');
  }

  const balance = data?.credit_balance || 0;
  console.log('💰 Saldo final:', balance);
  
  return balance;
}

// Executar testes
async function runTests() {
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await testGetBalance();
  }
  
  console.log('\n🎯 Testes concluídos!');
}

runTests().catch(console.error);
