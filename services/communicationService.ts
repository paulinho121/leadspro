
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
            // 1. Buscar configuração ativa
            const { data: settings } = await supabase
                .from('communication_settings')
                .select('*')
                .eq('tenant_id', payload.tenantId)
                .in('provider_type', ['whatsapp_evolution', 'whatsapp_zapi', 'whatsapp_duilio'])
                .eq('is_active', true)
                .single();

            if (!settings) throw new Error('Provedor de WhatsApp não configurado');

            // 2. Disparo Real por Provedor
            if (settings.provider_type === 'whatsapp_evolution') {
                await fetch(`${settings.api_url}/message/sendText/${settings.instance_name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key || '' },
                    body: JSON.stringify({ number: payload.leadId, text: payload.content })
                });
            } else if (settings.provider_type === 'whatsapp_zapi') {
                await fetch(`https://api.z-api.io/instances/${settings.instance_name}/token/${settings.api_key}/send-text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: payload.leadId, message: payload.content })
                });
            } else if (settings.provider_type === 'whatsapp_duilio') {
                await fetch('https://api.duilio.com.br/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.api_key}` },
                    body: JSON.stringify({ to: payload.leadId, text: payload.content })
                });
            }

            // 3. Registrar Log de Interação
            await supabase.from('ai_sdr_interactions').insert({
                tenant_id: payload.tenantId,
                lead_id: payload.leadId,
                channel: 'whatsapp',
                direction: 'outbound',
                content: payload.content,
                metadata: { provider: settings.provider_type }
            });

            return { success: true };
        } catch (error) {
            console.error('[CommunicationService] Erro Fatal:', error);
            return { success: false, error };
        }
    }

    /**
     * Envia um e-mail com Resend
     */
    static async sendEmail(payload: MessagePayload) {
        try {
            const { data: settings } = await supabase
                .from('communication_settings')
                .select('*')
                .eq('tenant_id', payload.tenantId)
                .eq('provider_type', 'email_resend')
                .eq('is_active', true)
                .single();

            if (!settings) throw new Error('Resend não configurado');

            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.api_key}`
                },
                body: JSON.stringify({
                    from: 'LeadPro <onboarding@resend.dev>',
                    to: payload.leadId,
                    subject: payload.subject || 'Oportunidade de Negócio',
                    html: payload.content
                })
            });

            if (response.ok) {
                await supabase.from('ai_sdr_interactions').insert({
                    tenant_id: payload.tenantId,
                    lead_id: payload.leadId,
                    channel: 'email',
                    direction: 'outbound',
                    content: payload.content
                });
                return { success: true };
            }
            return { success: false };
        } catch (error) {
            return { success: false, error };
        }
    }

    /**
     * Processa a fila de mensagens (Worker Simulator)
     */
    static async processMessageQueue() {
        try {
            const { data: pendingMessages } = await supabase
                .from('message_queue')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_for', new Date().toISOString())
                .limit(5);

            if (!pendingMessages || pendingMessages.length === 0) return;

            for (const msg of pendingMessages) {
                // Prevenir duplo processamento
                await supabase.from('message_queue').update({ status: 'processing' }).eq('id', msg.id);

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
                        content: msg.content,
                        subject: 'Nova Oportunidade'
                    });
                }

                // Atualizar status final na fila
                await supabase.from('message_queue').update({
                    status: result.success ? 'sent' : 'failed',
                    sent_at: result.success ? new Date().toISOString() : null,
                    error_message: result.error ? String(result.error) : null
                }).eq('id', msg.id);

                // Incrementar estatísticas da campanha via RPC se necessário
                if (result.success && msg.campaign_id) {
                    await supabase.rpc('increment_campaign_processed', { campaign_id: msg.campaign_id });
                }
            }
        } catch (error) {
            console.error('[Worker] Erro crítico na fila:', error);
        }
    }
}
