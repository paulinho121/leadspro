
import { supabase } from '../lib/supabase';

export type ActivityAction =
    | 'LEAD_CAPTURE'
    | 'LEAD_ENRICH'
    | 'LOGIN'
    | 'LOGOUT'
    | 'EXPORT'
    | 'SETTINGS_UPDATE'
    | 'SYSTEM_SYNC';

export class ActivityService {
    static async log(tenantId: string, userId: string, action: ActivityAction, details: string) {
        if (!tenantId || tenantId === 'default') return;

        try {
            await supabase.from('activity_logs').insert([{
                tenant_id: tenantId,
                user_id: userId,
                action,
                details
            }]);
        } catch (err) {
            console.error('[ActivityService] Falha ao registrar log:', err);
        }
    }
}
