import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';

export class HubSpotService {
    /**
     * Envia leads para o HubSpot CRM
     */
    static async pushLeads(leads: Lead[], tenantId: string): Promise<boolean> {
        try {
            if (!tenantId) {
                toast.error('Ocorreu um Erro', 'Sua sessão atual perdeu o Tenant ID.');
                return false;
            }

            const secrets = await SecretService.getTenantSecrets(tenantId);
            const token = secrets?.hubspot;

            if (!token) {
                toast.error('Token Ausente', 'Configure o token API do HubSpot CRM no painel Admin (Aba Integrações).');
                return false;
            }

            toast.info('Sincronizando Leads...', `Enviando ${leads.length} lead(s) para o HubSpot CRM.`);

            let successCount = 0;
            let errorCount = 0;

            for (const lead of leads) {
                // Separando nome
                const nameParts = (lead.name || 'Sem Nome').split(' ');
                const firstname = nameParts[0];
                const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : ' ';

                const payload = {
                    properties: {
                        email: lead.email || lead.details?.email || '',
                        firstname: firstname,
                        lastname: lastname,
                        phone: lead.phone || '',
                        company: lead.details?.tradeName || lead.name,
                        website: lead.website || '',
                        lifecyclestage: 'lead'
                    }
                };

                // Remove empty properties so HubSpot doesn't complain
                Object.keys(payload.properties).forEach(key => {
                    if (!(payload.properties as any)[key]) {
                        delete (payload.properties as any)[key];
                    }
                });

                try {
                    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok || response.status === 409) {
                        // Conta 409 (Conflict - Contact already exists) como sucesso parcial
                        successCount++;
                    } else {
                        console.error('[HubSpot] Erro em Payload:', await response.text());
                        errorCount++;
                    }
                } catch (fetchErr) {
                    console.error('[HubSpot] Fetch Error:', fetchErr);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success('Sincronização Push API Base', `${successCount} contatos sincronizados no HubSpot CRM.`);
                return true;
            } else if (errorCount > 0) {
                toast.error('Falha de Conversão API', `Não foi possível enviar ${errorCount} leads para o HubSpot.`);
                return false;
            }

            return false;

        } catch (err: any) {
            console.error('[HubSpot] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o provedor CRM.');
            return false;
        }
    }
}
