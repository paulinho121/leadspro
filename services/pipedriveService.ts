import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export class PipedriveService {
    /**
     * Envia leads para o Pipedrive CRM
     */
    static async pushLeads(leads: Lead[], tenantId: string): Promise<boolean> {
        try {
            if (!tenantId) {
                toast.error('Ocorreu um Erro', 'Sua sessão atual perdeu o Tenant ID.');
                return false;
            }

            const secrets = await SecretService.getTenantSecrets(tenantId);
            const token = secrets?.pipedrive;

            if (!token) {
                toast.error('Token Ausente', 'Configure o token API do Pipedrive CRM no painel Admin (Aba Integrações).');
                return false;
            }

            toast.info('Sincronizando Leads...', `Enviando ${leads.length} pessoa(s) para o Pipedrive CRM.`);

            const { data, error } = await supabase.functions.invoke('crm-sync', {
                body: { provider: 'pipedrive', token, leads }
            });

            if (error) {
                console.error('[Pipedrive] Erro na Edge Function:', error.message);
                toast.error('Sincronização Quebrada', 'Falha ao acionar módulo de integração do Pipedrive.');
                return false;
            }

            if (data?.ok) {
                toast.success('Sincronização Push API Base', `${data.successCount} leads criados no Pipedrive CRM.`);
                return true;
            } else {
                toast.error('Falha de Conversão API', data?.msg || 'Erro na comunicação com o Pipedrive.');
                return false;
            }

        } catch (err: any) {
            console.error('[Pipedrive] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o provedor CRM.');
            return false;
        }
    }
}
