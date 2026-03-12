
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkWallet() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        console.log('No session found. Please make sure .env.local is set up correctly.');
        return;
    }

    const userId = session.user.id;
    console.log('User ID:', userId);

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id, is_master_admin')
        .eq('id', userId)
        .single();

    console.log('Tenant ID:', profile?.tenant_id);
    console.log('Is Master Admin:', profile?.is_master_admin);

    if (profile?.tenant_id) {
        const { data: wallet } = await supabase
            .from('tenant_wallets')
            .select('*')
            .eq('tenant_id', profile.tenant_id)
            .single();

        console.log('Wallet Data:', wallet);
    }
}

checkWallet();
