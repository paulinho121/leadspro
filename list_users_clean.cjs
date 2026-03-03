const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY
);

async function listUsersAndTenants() {
    const { data: tenants, error: e1 } = await supabase.from('tenants').select('*');
    const { data: profiles, error: e2 } = await supabase.from('profiles').select('*');

    const output = {
        tenants: tenants || [],
        profiles: profiles || [],
        e1, e2
    };

    fs.writeFileSync('db_output.json', JSON.stringify(output, null, 2));
    console.log('Output written to db_output.json');
}

listUsersAndTenants();
