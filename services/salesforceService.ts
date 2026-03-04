import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';
import { supabase } from '../lib/supabase';

export class SalesforceService {
    /**
     * Envia leads para o Salesforce CRM
     */
    static async pushLeads(leads: Lead[], tenantId: string): Promise<boolean> {
        try {
            if (!tenantId) {
                toast.error('Ocorreu um Erro', 'Sua sessão atual perdeu o Tenant ID.');
                return false;
            }

            const secrets = await SecretService.getTenantSecrets(tenantId);
            const tokenConfig = secrets?.salesforce;

            if (!tokenConfig) {
                toast.error('Token Ausente', 'Configure o acesso do Salesforce CRM no painel Admin (Aba Integrações). Ex: https://sua-instancia.my.salesforce.com::TOKEN');
                return false;
            }

            const { data, error } = await supabase.functions.invoke('crm-sync', {
                body: { provider: 'salesforce', token: tokenConfig, leads } // Sends the raw config which is instanceUrl::token
            });

            if (error) {
                console.error('[Salesforce] Erro na Edge Function:', error.message);
                toast.error('Sincronização Quebrada', 'Falha ao acionar módulo de integração do Salesforce.');
                return false;
            }

            if (data?.ok) {
                toast.success('Sincronização Push API Base', `${data.successCount} leads criados no Salesforce.`);
                return true;
            } else {
                toast.error('Falha de Conversão API', data?.msg || 'Erro na comunicação com o Salesforce.');
                return false;
            }

        } catch (err: any) {
            console.error('[Salesforce] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o Salesforce.');
            return false;
        }
    }
}
