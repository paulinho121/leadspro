import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export class RDStationService {
    /**
     * Envia leads para o RD Station CRM 
     */
    static async pushLeads(leads: Lead[], tenantId: string): Promise<boolean> {
        try {
            if (!tenantId) {
                toast.error('Ocorreu um Erro', 'Sua sessão atual perdeu o Tenant ID.');
                return false;
            }

            const secrets = await SecretService.getTenantSecrets(tenantId);
            const token = secrets?.rdStation;

            if (!token) {
                toast.error('Token Ausente', 'Configure o token API do RD Station CRM no painel Admin (Aba Integrações).');
                return false;
            }

            toast.info('Sincronizando Leads...', `Enviando ${leads.length} lead(s) via RD Station CRM API.`);

            const { data, error } = await supabase.functions.invoke('crm-sync', {
                body: { provider: 'rd_station', token, leads }
            });

            if (error) {
                console.error('[RDStation] Erro na Edge Function:', error.message);
                toast.error('Sincronização Quebrada', 'Falha ao acionar módulo de integração do RD Station.');
                return false;
            }

            if (data?.ok) {
                toast.success('Sincronização Push API Base', `${data.successCount} leads criados no CRM com sucesso.`);
                return true;
            } else {
                toast.error('Falha de Conversão API', data?.msg || 'Erro na comunicação com o RD Station CRM.');
                return false;
            }

        } catch (err: any) {
            console.error('[RDStation] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o provedor CRM.');
            return false;
        }
    }
}
