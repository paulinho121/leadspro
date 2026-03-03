const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').map(line => line.trim()).filter(line => line.includes('=')).forEach(line => {
    const [key, ...value] = line.split('=');
    env[key.trim()] = value.join('=').trim();
});

const supabase = createClient(
    env.VITE_SUPABASE_URL,
    env.VITE_SUPABASE_ANON_KEY
);

async function checkIntruder() {
    const intruderId = '25b90f34-644b-4c1a-8148-dd88e647f441';

    console.log(`Checking logs for user ID: ${intruderId}...`);

    // Check if user exists in profiles
    const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', intruderId)
        .single();

    if (profileErr) {
        console.log(`Profile not found in 'public.profiles'. Error: ${profileErr.message}`);
    } else {
        console.log('--- PROFILE FOUND ---');
        console.log(JSON.stringify(profile, null, 2));
    }

    // Check activity logs
    const { data: logs, error: logsErr } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('user_id', intruderId)
        .order('created_at', { ascending: false })
        .limit(20);

    if (logsErr) {
        console.log(`Error fetching activity logs: ${logsErr.message}`);
    } else {
        console.log('--- RECENT ACTIVITY LOGS ---');
        console.log(JSON.stringify(logs, null, 2));
    }
}

checkIntruder();
