
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqwhmzvytebrwpokkhdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxd2htenZ5dGVicndwb2traGR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NjQxMTEsImV4cCI6MjA4ODE0MDExMX0.cgWsc-4YTp5SAMb33aUiQf9FYY8WY64oJCsbK4EKhck';
const supabase = createClient(supabaseUrl, supabaseKey);

async function listWallets() {
    const { data: wallets, error } = await supabase
        .from('tenant_wallets')
        .select('*, tenants(name, slug)')
        .order('credit_balance', { ascending: false });

    if (error) {
        console.error('Error fetching wallets:', error);
        return;
    }

    console.table(wallets.map(w => ({
        tenant: w.tenants?.name || 'Unknown',
        balance: w.credit_balance,
        id: w.tenant_id
    })));
}

listWallets();
