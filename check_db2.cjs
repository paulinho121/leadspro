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

async function checkDb() {
    const { data: keys, error: e1 } = await supabase.from('tenant_api_keys').select('*');
    console.log('Keys:', JSON.stringify(keys, null, 2), e1);

    const { data: configs, error: e2 } = await supabase.from('white_label_configs').select('*').limit(2);
    console.log('Configs:', JSON.stringify(configs, null, 2), e2);
}

checkDb();
