
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkMasterAdmin() {
    try {
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, is_master_admin')
            .eq('is_master_admin', true);

        if (error) {
            console.error('Error fetching profiles:', error);
            return;
        }

        console.log('Master Admins found:', profiles);
    } catch (e) {
        console.error('Catch error:', e);
    }
}

checkMasterAdmin();
