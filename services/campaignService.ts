
import { supabase } from '../lib/supabase';
import { SdrService } from './sdrService';

export class CampaignService {
    /**
     * Inicia uma campanha de disparo em massa
     */
    static async startCampaign(tenantId: string, campaignId: string, leadIds: string[]) {
        try {
            // 1. Buscar dados da campanha
            const { data: campaign } = await supabase
                .from('outreach_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (!campaign) throw new Error('Campanha não encontrada');

            // 2. Atualizar status para running
            await supabase
                .from('outreach_campaigns')
                .update({ status: 'running', total_leads: leadIds.length })
                .eq('id', campaignId);

            // 3. Preparar mensagens na fila com delay randômico para evitar block
            const queueItems = [];
            let delayMinutes = 0;

            for (const leadId of leadIds) {
                // Buscar dados do lead para personalização
                const { data: lead } = await supabase
                    .from('leads')
                    .select('*')
                    .eq('id', leadId)
                    .single();

                if (!lead) continue;

                // Aqui poderíamos usar o SdrService para personalizar cada uma
                // Mas por performance em massa, usamos o template da campanha com variáveis
                const content = campaign.template_content
                    .replace('${name}', lead.name)
                    .replace('${industry}', lead.industry || 'seu setor')
                    .replace('${location}', lead.location || 'sua região');

                const scheduleDate = new Date();
                scheduleDate.setMinutes(scheduleDate.getMinutes() + delayMinutes);

                queueItems.push({
                    tenant_id: tenantId,
                    campaign_id: campaignId,
                    lead_id: leadId,
                    channel: campaign.channel,
                    content,
                    status: 'pending',
                    scheduled_for: scheduleDate.toISOString()
                });

                // Incrementar delay (ex: 2 a 5 minutos entre mensagens de WhatsApp)
                const randomGap = campaign.channel === 'whatsapp'
                    ? Math.floor(Math.random() * 3) + 2
                    : 1;
                delayMinutes += randomGap;
            }

            // 4. Inserir em massa na fila
            const { error } = await supabase
                .from('message_queue')
                .insert(queueItems);

            if (error) throw error;

            return { success: true, count: queueItems.length };
        } catch (error) {
            console.error('[CampaignService] Erro ao iniciar:', error);
            return { success: false, error };
        }
    }

    /**
     * Pausa uma campanha ativa
     */
    static async pauseCampaign(campaignId: string) {
        await supabase
            .from('outreach_campaigns')
            .update({ status: 'paused' })
            .eq('id', campaignId);

        // Também pausar mensagens pendentes dessa campanha na fila
        await supabase
            .from('message_queue')
            .update({ status: 'scheduled' }) // Tira de pending para não ser processada
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');
    }

    /**
     * Exclui uma campanha e limpa a fila de mensagens associada
     */
    static async deleteCampaign(campaignId: string) {
        // 1. Limpar fila de mensagens
        await supabase
            .from('message_queue')
            .delete()
            .eq('campaign_id', campaignId);

        // 2. Excluir a campanha
        const { error } = await supabase
            .from('outreach_campaigns')
            .delete()
            .eq('id', campaignId);

        if (error) throw error;
        return { success: true };
    }
}
