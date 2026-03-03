
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
    env.VITE_SUPABASE_ANON_KEY,
    {
        auth: { persistSession: false },
        global: {
            fetch: (...args) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 10000);
                return fetch(...args, { signal: controller.signal }).finally(() => clearTimeout(timeout));
            }
        }
    }
);

async function check() {
    console.log('Checking connection...');
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Profile count:', data);
        }

        const { data: recentLogs, error: logError } = await supabase
            .from('activity_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        if (logError) {
            console.error('Logs Error:', logError);
        } else {
            console.log('Recent logs:', JSON.stringify(recentLogs, null, 2));
        }

    } catch (err) {
        console.error('Connection/Fetch Error:', err.message);
    }
}

check();
