
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listProfiles() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(10);

        if (error) {
            console.error('Error fetching profiles:', error);
            return;
        }

        console.log('Profiles:', profiles);
    } catch (e) {
        console.error('Catch error:', e);
    }
}

listProfiles();
