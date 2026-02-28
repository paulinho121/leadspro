
import { supabase } from '../lib/supabase';
import { SdrService } from './sdrService';
import { CommunicationService } from './communicationService';

export class AutomationService {
    /**
     * Processa uma mensagem recebida e verifica se existem regras de automação
     */
    /**
     * Reber mensagem e agendar processamento assíncrono
     * Isso garante que o webhook responda rápido (< 200ms)
     */
    static async handleIncomingMessage(tenantId: string, leadId: string, content: string) {
        // 1. Analisar a intenção rapidamente
        const analysis = await SdrService.analyzeResponse(content);

        // 2. Registrar a interação
        const { data: interaction } = await supabase.from('ai_sdr_interactions').insert({
            tenant_id: tenantId,
            lead_id: leadId,
            channel: 'whatsapp',
            direction: 'inbound',
            content,
            ai_analysis: analysis
        }).select().single();

        // 3. AGENDAR PROCESSAMENTO PROFISSIONAL (Queue System)
        // Em vez de rodar síncrono, enviamos para a fila
        await supabase.from('background_tasks').insert({
            tenant_id: tenantId,
            type: 'PROCESS_AUTOMATION_RULE',
            payload: {
                lead_id: leadId,
                interaction_id: interaction?.id,
                analysis: analysis,
                trigger_type: 'incoming_message'
            },
            status: 'pending'
        });

        console.log(`[Automation] Mensagem de ${leadId} agendada para processamento assíncrono.`);
    }

    /**
     * Avalia se as condições da regra batem com a análise da IA
     */
    private static evaluateConditions(analysis: any, conditions: any): boolean {
        if (!conditions || Object.keys(conditions).length === 0) return true;

        // Ex: { "intent": "positive" }
        if (conditions.intent && analysis.intent !== conditions.intent) return false;

        return true;
    }

    /**
     * Executa a ação pré-configurada
     */
    private static async executeAction(tenantId: string, leadId: string, actionType: string, payload: any) {
        console.log(`[Automation] Executando ação ${actionType} para o lead ${leadId}`);

        switch (actionType) {
            case 'send_reply':
                await CommunicationService.sendWhatsApp({
                    tenantId,
                    leadId,
                    channel: 'whatsapp',
                    content: payload.template || 'Olá! Recebi sua mensagem e logo te retorno.'
                });
                break;

            case 'move_stage':
                // Atualizar o CRM/Pipeline (Tabela deals ou leads)
                await supabase
                    .from('leads')
                    .update({ status: payload.new_status || 'ENRICHED' })
                    .eq('id', leadId);
                break;

            case 'notify_admin':
                // Futuramente: Integração com Slack/Discord ou Push
                console.log(`[Notification] Lead ${leadId} precisa de atenção imediata!`);
                break;
        }
    }
}
