
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
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
