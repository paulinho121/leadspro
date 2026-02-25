
import { supabase } from '../lib/supabase';
import { SdrService } from './sdrService';
import { CommunicationService } from './communicationService';

export class AutomationService {
    /**
     * Processa uma mensagem recebida e verifica se existem regras de automação
     */
    static async handleIncomingMessage(tenantId: string, leadId: string, content: string) {
        // 1. Analisar a intenção da mensagem usando IA
        const analysis = await SdrService.analyzeResponse(content);

        // 2. Registrar a interação recebida
        await supabase.from('ai_sdr_interactions').insert({
            tenant_id: tenantId,
            lead_id: leadId,
            channel: 'whatsapp',
            direction: 'inbound',
            content,
            ai_analysis: analysis
        });

        // 3. Buscar regras de automação ativas para este gatilho
        const { data: rules } = await supabase
            .from('automation_rules')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('trigger_type', 'incoming_message')
            .eq('is_active', true);

        if (!rules || rules.length === 0) return;

        // 4. Avaliar cada regra (Simple Engine)
        for (const rule of rules) {
            const shouldExecute = this.evaluateConditions(analysis, rule.conditions);

            if (shouldExecute) {
                await this.executeAction(tenantId, leadId, rule.action_type, rule.action_payload);
            }
        }
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
