
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').map(line => line.trim()).filter(line => line.includes('=')).forEach(line => {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function search() {
    console.log('Searching for intruder traces...');

    // Check profiles for name or ID
    const { data: pFound, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .or('full_name.ilike.%Alejandro%,full_name.ilike.%FX%,id.eq.25b90f34-644b-4c1a-8148-dd88e647f441');

    console.log('Intruder Profiles:', pFound);

    // Check recent logs for the intruder ID
    const { data: logs, error: lErr } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', '25b90f34-644b-4c1a-8148-dd88e647f441')
        .limit(5);

    console.log('Intruder Logs found:', logs?.length || 0);

    // Check if the "Default Organization" has suspicious leads
    const { data: leads, error: leadErr } = await supabase
        .from('leads')
        .select('count', { count: 'exact', head: true });

    console.log('Total Leads in system:', leads);
}

search();
