import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';

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

            let successCount = 0;
            let errorCount = 0;

            for (const lead of leads) {
                const empresaName = lead.details?.tradeName || lead.name;

                const payload = {
                    token: token,
                    deal: {
                        name: `Venda - ${empresaName}`,
                        rating: 1
                    },
                    organization: {
                        organization: {
                            name: empresaName
                        }
                    },
                    contacts: [
                        {
                            name: lead.name || empresaName,
                            emails: lead.email || lead.details?.email ? [{ email: lead.email || lead.details?.email }] : [],
                            phones: lead.phone ? [{ phone: lead.phone }] : []
                        }
                    ],
                    deal_custom_fields: [] as any[]
                };

                // Adicionar campos customizados nativos se fornecido
                // if (lead.ai_insights) { payload.deal.deal_custom_fields.push(...) }

                try {
                    const response = await fetch(`https://crm.rdstation.com/api/v1/deals?token=${token}`, {
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
                        console.error('[RDStation] Erro em Payload:', await response.text());
                        errorCount++;
                    }
                } catch (fetchErr) {
                    console.error('[RDStation] Fetch Error:', fetchErr);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success('Sincronização Push API Base', `${successCount} leads criados no CRM com sucesso.`);
                return true;
            } else if (errorCount > 0) {
                toast.error('Falha de Conversão API', `Não foi possível enviar ${errorCount} leads para o RD Station CRM.`);
                return false;
            }

            return false;

        } catch (err: any) {
            console.error('[RDStation] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o provedor CRM.');
            return false;
        }
    }
}
