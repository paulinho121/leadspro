
import { supabase } from '../lib/supabase';

export class IntegrationService {
    /**
     * Dispara webhooks configurados para um determinado evento e tenant
     */
    static async triggerWebhooks(tenantId: string, event: string, payload: any) {
        try {
            // Se o tenantId for 'default', normalizamos (uso em dev)
            const normalizedTenantId = tenantId === 'default'
                ? '00000000-0000-0000-0000-000000000000'
                : tenantId;

            // 1. Buscar webhooks ativos para este evento
            const { data: webhooks, error } = await supabase
                .from('webhooks')
                .select('*')
                .eq('tenant_id', normalizedTenantId)
                .eq('event_type', event)
                .eq('is_active', true);

            if (error) throw error;
            if (!webhooks || webhooks.length === 0) return;

            console.log(`[IntegrationService] Disparando ${webhooks.length} webhooks para o evento ${event}`);

            // 2. Disparar cada webhook de forma assíncrona
            const promises = webhooks.map(async (wh) => {
                const startTime = Date.now();
                let status = 0;
                let responseBody = '';
                let errorMessage = '';

                try {
                    const response = await fetch(wh.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Webhook-Secret': wh.secret_token || '',
                            'X-Event-Type': event
                        },
                        body: JSON.stringify({
                            id: crypto.randomUUID(),
                            event,
                            tenant_id: tenantId,
                            timestamp: new Date().toISOString(),
                            data: payload
                        })
                    });

                    status = response.status;
                    responseBody = await response.text();
                } catch (err: any) {
                    errorMessage = err.message || 'Falha na requisição';
                    console.error(`[IntegrationService] Erro ao disparar para ${wh.url}:`, err);
                }

                // 3. Logar a execução
                await supabase.from('webhook_logs').insert({
                    webhook_id: wh.id,
                    payload: payload,
                    response_status: status,
                    response_body: responseBody.substring(0, 1000), // Limitar tamanho
                    error_message: errorMessage
                });
            });

            await Promise.allSettled(promises);
        } catch (err) {
            console.error('[IntegrationService] Falha crítica ao processar webhooks:', err);
        }
    }
}
