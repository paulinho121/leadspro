import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';

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

            let successCount = 0;
            let errorCount = 0;

            for (const lead of leads) {
                const payload = {
                    name: lead.name || lead.details?.tradeName || 'Lead Sem Nome',
                    phone: lead.phone ? [{ value: lead.phone, primary: true }] : [],
                    email: lead.email || lead.details?.email ? [{ value: lead.email || lead.details?.email, primary: true }] : []
                };

                try {
                    const response = await fetch(`https://api.pipedrive.com/v1/persons?api_token=${token}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        console.error('[Pipedrive] Erro em Payload:', await response.text());
                        errorCount++;
                    }
                } catch (fetchErr) {
                    console.error('[Pipedrive] Fetch Error:', fetchErr);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success('Sincronização Push API Base', `${successCount} pessoas/leads criados no Pipedrive CRM.`);
                return true;
            } else if (errorCount > 0) {
                toast.error('Falha de Conversão API', `Não foi possível enviar ${errorCount} leads para o Pipedrive.`);
                return false;
            }

            return false;

        } catch (err: any) {
            console.error('[Pipedrive] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o provedor CRM.');
            return false;
        }
    }
}
