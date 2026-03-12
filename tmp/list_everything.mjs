
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqwhmzvytebrwpokkhdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd2htenZ5dGVicndwb2traGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQxMTEsImV4cCI6MjA4ODE0MDExMX0.cgWsc-4YTp5SAMb33aUiQf9FYY8WY64oJCsbK4EKhck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listEverything() {
    console.log('--- Profiles ---');
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, role, tenant_id').limit(10);
    console.table(profiles);

    console.log('--- Tenants ---');
    const { data: tenants } = await supabase.from('tenants').select('id, name, slug').limit(10);
    console.table(tenants);

    console.log('--- Wallets ---');
    const { data: wallets } = await supabase.from('tenant_wallets').select('*');
    console.table(wallets);
}

listEverything();
