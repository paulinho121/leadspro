
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').map(line => line.trim()).filter(line => line.includes('=')).forEach(line => {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function check() {
    console.log('Querying Profiles...');
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, tenant_id').limit(10);
    console.log('Profiles:', profiles);
    if (pErr) console.error('Error:', pErr);

    console.log('Querying Tenants...');
    const { data: tenants, error: tErr } = await supabase.from('tenants').select('id, name, slug').limit(10);
    console.log('Tenants:', tenants);
    if (tErr) console.error('Error:', tErr);
}

check();
