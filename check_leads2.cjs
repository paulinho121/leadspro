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

async function checkLeads() {
    const { data, error } = await supabase.from('leads').select('*').limit(5);
    console.log('Error:', error);
    console.log('Leads:', data);

    const { data: st, error: e2 } = await supabase.from('leads').select('status');
    console.log('Statuses:', st ? st.reduce((acc, l) => {
        acc[l.status] = (acc[l.status] || 0) + 1;
        return acc;
    }, {}) : e2);
}

checkLeads();
