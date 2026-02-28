const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

async function checkLeads() {
    const { data, error } = await supabase.from('leads').select('status, count()').group('status');
    console.log('Error:', error);
    console.log('Leads count by status:', data);

    const { data: q, error: e2 } = await supabase.rpc('get_leads_count', {});
    console.log('RPC check', q, e2);
}

checkLeads();
