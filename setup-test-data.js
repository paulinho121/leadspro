import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase
const supabaseUrl = 'https://cqwhmzvytebrwpokkhdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd2htenZ5dGVicndwb2traGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQxMTEsImV4cCI6MjA4ODE0MDExMX0.cgWsc-4YTp5SAMb33aUiQf9FYY8WY64oJCsbK4EKhck';

console.log('🚀 Configurando dados de teste para LeadPro...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupTestData() {
  try {
    // 1. Criar tenant
    console.log('\n📋 1. Criando tenant de teste...');
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Test Tenant',
        slug: 'test-tenant',
        plan: 'pro',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (tenantError) {
      console.error('❌ Erro ao criar tenant:', tenantError);
      return;
    }

    console.log('✅ Tenant criado:', tenant);

    // 2. Criar profile
    console.log('\n📋 2. Criando profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'test@leadpro.com',
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Erro ao criar profile:', profileError);
      return;
    }

    console.log('✅ Profile criado:', profile);

    // 3. Criar wallet com créditos
    console.log('\n📋 3. Criando wallet com créditos...');
    const { data: wallet, error: walletError } = await supabase
      .from('tenant_wallets')
      .upsert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        credit_balance: 10000,
        auto_recharge_enabled: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (walletError) {
      console.error('❌ Erro ao criar wallet:', walletError);
      return;
    }

    console.log('✅ Wallet criada:', wallet);

    // 4. Adicionar transações
    console.log('\n📋 4. Adicionando transações...');
    const { data: transactions, error: transError } = await supabase
      .from('credit_transactions')
      .upsert([
        {
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          amount: 10000,
          type: 'purchase',
          service_name: 'stripe',
          description: 'Créditos iniciais',
          created_at: new Date().toISOString()
        },
        {
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          amount: -50,
          type: 'usage',
          service_name: 'gemini',
          description: 'Teste de enriquecimento',
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (transError) {
      console.error('❌ Erro ao criar transações:', transError);
      return;
    }

    console.log('✅ Transações criadas:', transactions?.length || 0);

    // 5. Criar leads de teste
    console.log('\n📋 5. Criando leads de teste...');
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .upsert([
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          name: 'Empresa Teste 1',
          status: 'new',
          location: 'São Paulo, SP',
          industry: 'Tecnologia',
          website: 'https://empresa1.com.br',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          name: 'Empresa Teste 2',
          status: 'new',
          location: 'Rio de Janeiro, RJ',
          industry: 'Serviços',
          website: 'https://empresa2.com.br',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          name: 'Empresa Teste 3',
          status: 'enriched',
          location: 'Belo Horizonte, MG',
          industry: 'Comércio',
          website: 'https://empresa3.com.br',
          tenant_id: '550e8400-e29b-41d4-a716-446655440000',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

    if (leadsError) {
      console.error('❌ Erro ao criar leads:', leadsError);
      return;
    }

    console.log('✅ Leads criados:', leads?.length || 0);

    // 6. Verificar resultado final
    console.log('\n📊 6. Verificando resultado final...');
    
    const { data: finalWallet } = await supabase
      .from('tenant_wallets')
      .select('credit_balance, auto_recharge_enabled, updated_at')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440000')
      .single();

    const { data: finalLeads } = await supabase
      .from('leads')
      .select('name, status, location, industry')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440000');

    console.log('\n🎯 DADOS CONFIGURADOS COM SUCESSO!');
    console.log('💰 Saldo do tenant:', finalWallet?.credit_balance || 0, 'créditos');
    console.log('🔄 Auto-recharge:', finalWallet?.auto_recharge_enabled ? 'Ativado' : 'Desativado');
    console.log('📋 Leads criados:', finalLeads?.length || 0);
    
    if (finalLeads && finalLeads.length > 0) {
      console.log('\n📝 Leads de teste:');
      finalLeads.forEach((lead, index) => {
        console.log(`${index + 1}. ${lead.name} - ${lead.status} - ${lead.location}`);
      });
    }

    // 7. Testar getBalance
    console.log('\n📋 7. Testando função getBalance...');
    const balance = await testGetBalance();
    console.log('✅ getBalance retornou:', balance);

    console.log('\n🎉 SETUP CONCLUÍDO COM SUCESSO!');
    console.log('🔗 Tenant ID: 550e8400-e29b-41d4-a716-446655440000');
    console.log('💰 Créditos disponíveis: 10.000');
    console.log('📧 Email de teste: test@leadpro.com');

  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

async function testGetBalance() {
  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  
  const { data, error } = await supabase
    .from('tenant_wallets')
    .select('credit_balance')
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) {
    console.error('❌ Erro no getBalance:', error);
    return 0;
  }

  return data?.credit_balance || 0;
}

// Executar setup
setupTestData().catch(console.error);
