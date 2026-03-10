
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

            // 2. Disparo via Edge Function Proxy (Backend)
            const { data, error } = await supabase.functions.invoke('send-communication', {
                body: {
                    channel: 'whatsapp',
                    settings: {
                        provider_type: settings.provider_type,
                        api_url: settings.api_url ? settings.api_url.replace(/\/$/, '') : '',
                        api_key: settings.api_key,
                        instance_name: settings.instance_name,
                        client_token: settings.client_token
                    },
                    payload: {
                        to: payload.leadId,
                        content: payload.content
                    }
                }
            });

            if (error || data?.error) {
                const errorData = error?.message || data?.error || 'Sem resposta do provedor proxy';
                throw new Error(`Erro no provedor via Proxy (${settings.provider_type}): ${errorData}`);
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

            const { data, error } = await supabase.functions.invoke('send-communication', {
                body: {
                    channel: 'email',
                    settings: {
                        provider_type: settings.provider_type,
                        api_key: settings.api_key
                    },
                    payload: {
                        to: payload.leadId,
                        content: payload.content,
                        subject: payload.subject
                    }
                }
            });

            if (data?.success) {
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
                .select('*, lead:leads(id, name, phone, email)')
                .eq('status', 'pending')
                .lte('scheduled_for', new Date().toISOString())
                .limit(10); // Aumentado para 10 para eficiência

            if (!pendingMessages || pendingMessages.length === 0) return;

            for (const msg of pendingMessages as any) {
                // Prevenir duplo processamento
                await supabase.from('message_queue').update({ status: 'processing' }).eq('id', msg.id);

                let result;
                const contactId = msg.channel === 'whatsapp' ? msg.lead?.phone : msg.lead?.email;

                if (!contactId) {
                    await supabase.from('message_queue').update({
                        status: 'failed',
                        error_message: 'Lead sem informação de contato (Phone/Email)'
                    }).eq('id', msg.id);
                    continue;
                }

                if (msg.channel === 'whatsapp') {
                    result = await this.sendWhatsApp({
                        tenantId: msg.tenant_id,
                        leadId: contactId,
                        channel: 'whatsapp',
                        content: msg.content
                    });
                } else {
                    result = await this.sendEmail({
                        tenantId: msg.tenant_id,
                        leadId: contactId,
                        channel: 'email',
                        content: msg.content,
                        subject: msg.subject || 'Nova Oportunidade'
                    });
                }

                // Atualizar status final na fila
                await supabase.from('message_queue').update({
                    status: result.success ? 'sent' : 'failed',
                    sent_at: result.success ? new Date().toISOString() : null,
                    error_message: result.error ? String(result.error) : null
                }).eq('id', msg.id);

                // Incrementar estatísticas da campanha via RPC
                if (result.success && msg.campaign_id) {
                    await supabase.rpc('increment_campaign_processed', { campaign_id: msg.campaign_id });
                }
            }
        } catch (error) {
            console.error('[Worker] Erro crítico na fila:', error);
        }
    }
}
