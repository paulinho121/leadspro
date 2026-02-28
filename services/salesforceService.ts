import { Lead } from '../types';
import { SecretService } from './secretService';
import { toast } from '../components/Toast';

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

            // Salesforce exige a URL da instância E o Bearer token
            // O usuário pode prover algo como "https://urldainstancia.salesforce.com::BEARER_TOKEN"
            // Se tiver só o token vamos apenas notificar
            let instanceUrl = '';
            let authToken = tokenConfig;

            if (tokenConfig.includes('::')) {
                [instanceUrl, authToken] = tokenConfig.split('::');
            } else {
                toast.error('Formato Inválido', 'Salesforce precisa da URL::Token. Verifique as configurações.');
                return false;
            }

            // Format instanceUrl ensuring it doesn't end with a slash
            instanceUrl = instanceUrl.trim().replace(/\/$/, "");
            authToken = authToken.trim();

            toast.info('Sincronizando Leads...', `Enviando ${leads.length} lead(s) para o Salesforce CRM.`);

            let successCount = 0;
            let errorCount = 0;

            for (const lead of leads) {
                // Separando nome
                const nameParts = (lead.name || 'Sem Nome').split(' ');
                const firstname = nameParts[0];
                const lastname = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Desconhecido';

                const payload = {
                    FirstName: firstname,
                    LastName: lastname,
                    Company: lead.details?.tradeName || lead.name || 'Empresa Desconhecida',
                    Email: lead.email || lead.details?.email || '',
                    Phone: lead.phone || '',
                    Website: lead.website || '',
                    Industry: lead.industry || ''
                };

                try {
                    const response = await fetch(`${instanceUrl}/services/data/v58.0/sobjects/Lead`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok || response.status === 201) {
                        successCount++;
                    } else {
                        console.error('[Salesforce] Erro em Payload:', await response.text());
                        errorCount++;
                    }
                } catch (fetchErr) {
                    console.error('[Salesforce] Fetch Error:', fetchErr);
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success('Sincronização Push API Base', `${successCount} leads criados no Salesforce.`);
                return true;
            } else if (errorCount > 0) {
                toast.error('Falha de Conversão API', `Não foi possível enviar ${errorCount} leads para o Salesforce.`);
                return false;
            }

            return false;

        } catch (err: any) {
            console.error('[Salesforce] Erro fatal de integração:', err);
            toast.error('Sincronização Quebrada', 'Erro fatal na comunicação com o Salesforce.');
            return false;
        }
    }
}
