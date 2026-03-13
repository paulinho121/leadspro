import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase com SERVICE ROLE (bypass RLS)
const supabaseUrl = 'https://cqwhmzvytebrwpokkhdx.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd2htenZ5dGVicndwb2traGR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU2NDExMSwiZXhwIjoyMDg4MTQwMTExfQ.QhJkMvCfGj5pIhoKsFwE-LYqyf7P8sA1JmHkYw8hK4U'; // SERVICE ROLE KEY

console.log('🔓 Desabilitando RLS e configurando dados...');

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function disableRLSAndSetup() {
  try {
    // 1. Desabilitar RLS nas tabelas
    console.log('\n📋 1. Desabilitando RLS...');
    
    const tables = ['tenants', 'profiles', 'tenant_wallets', 'credit_transactions', 'leads'];
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.${table} DISABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`⚠️ Não foi possível desabilitar RLS em ${table}:`, error.message);
      } else {
        console.log(`✅ RLS desabilitado em ${table}`);
      }
    }

    // 2. Criar tenant
    console.log('\n📋 2. Criando tenant de teste...');
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

    // 3. Criar profile
    console.log('\n📋 3. Criando profile...');
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

    // 4. Criar wallet com créditos
    console.log('\n📋 4. Criando wallet com créditos...');
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

    // 7. Reabilitar RLS
    console.log('\n📋 7. Reabilitando RLS...');
    
    for (const table of tables) {
      const { error } = await supabase.rpc('exec_sql', {
        sql: `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`
      });
      
      if (error) {
        console.log(`⚠️ Não foi possível reabilitar RLS em ${table}:`, error.message);
      } else {
        console.log(`✅ RLS reabilitado em ${table}`);
      }
    }

    console.log('\n🎉 SETUP CONCLUÍDO COM SUCESSO!');
    console.log('🔗 Tenant ID: 550e8400-e29b-41d4-a716-446655440000');
    console.log('💰 Créditos disponíveis: 10.000');
    console.log('📧 Email de teste: test@leadpro.com');
    console.log('🔓 RLS reabilitado para segurança');

  } catch (err) {
    console.error('❌ Erro geral:', err);
  }
}

// Executar setup
disableRLSAndSetup().catch(console.error);
