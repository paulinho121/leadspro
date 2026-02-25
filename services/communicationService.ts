
import { supabase } from '../lib/supabase';

export interface MessagePayload {
    tenantId: string;
    leadId: string;
    channel: 'whatsapp' | 'email';
    content: string;
    subject?: string;
}

export class CommunicationService {
    /**
     * Envia uma mensagem via WhatsApp (Suporta Evolution, Z-API, Duilio)
     */
    static async sendWhatsApp(payload: MessagePayload) {
        try {
            // 1. Buscar qualquer configuração de WhatsApp ativa do Tenant
            const { data: settings } = await supabase
                .from('communication_settings')
                .select('*')
                .eq('tenant_id', payload.tenantId)
                .in('provider_type', ['whatsapp_evolution', 'whatsapp_zapi', 'whatsapp_duilio'])
                .eq('is_active', true)
                .limit(1)
                .single();

            if (!settings) throw new Error('Configuração de WhatsApp ativa não encontrada');

            // 2. Disparo baseado no Provedor
            console.log(`[WhatsApp] [${settings.provider_type}] Enviando para ${payload.leadId}: ${payload.content.substring(0, 30)}...`);

            // Simulação de implementação por provedor
            if (settings.provider_type === 'whatsapp_zapi') {
                console.log(`[Z-API] Usando Instância: ${settings.instance_name}`);
            } else if (settings.provider_type === 'whatsapp_duilio') {
                console.log(`[Duílio] Usando Token: ${settings.api_key?.substring(0, 5)}...`);
            } else {
                console.log(`[Evolution] Usando Endpoint: ${settings.api_url}`);
            }

            // 3. Registrar no histórico de interações
            await supabase.from('ai_sdr_interactions').insert({
                tenant_id: payload.tenantId,
                lead_id: payload.leadId,
                channel: 'whatsapp',
                direction: 'outbound',
                content: payload.content
            });

            return { success: true };
        } catch (error) {
            console.error('[CommunicationService] Erro no WhatsApp:', error);
            return { success: false, error };
        }
    }

    /**
     * Envia um e-mail (Resend / SMTP)
     */
    static async sendEmail(payload: MessagePayload) {
        try {
            const { data: settings } = await supabase
                .from('communication_settings')
                .select('*')
                .eq('tenant_id', payload.tenantId)
                .eq('provider_type', 'email_resend')
                .single();

            if (!settings) throw new Error('Configurações de E-mail não encontradas');

            console.log(`[Email] Enviando assunto "${payload.subject}" para ${payload.leadId}`);

            await supabase.from('ai_sdr_interactions').insert({
                tenant_id: payload.tenantId,
                lead_id: payload.leadId,
                channel: 'email',
                direction: 'outbound',
                content: `${payload.subject}\n\n${payload.content}`
            });

            return { success: true };
        } catch (error) {
            console.error('[CommunicationService] Erro no Email:', error);
            return { success: false, error };
        }
    }

    /**
     * Processa a fila de mensagens (Worker Simulator)
     */
    static async processMessageQueue() {
        const { data: pendingMessages } = await supabase
            .from('message_queue')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .limit(5);

        if (!pendingMessages) return;

        for (const msg of pendingMessages) {
            let result;
            if (msg.channel === 'whatsapp') {
                result = await this.sendWhatsApp({
                    tenantId: msg.tenant_id,
                    leadId: msg.lead_id,
                    channel: 'whatsapp',
                    content: msg.content
                });
            } else {
                result = await this.sendEmail({
                    tenantId: msg.tenant_id,
                    leadId: msg.lead_id,
                    channel: 'email',
                    content: msg.content
                });
            }

            // Atualizar status na fila
            await supabase.from('message_queue').update({
                status: result.success ? 'sent' : 'failed',
                sent_at: result.success ? new Date().toISOString() : null,
                error_message: result.error ? String(result.error) : null
            }).eq('id', msg.id);
        }
    }
}
