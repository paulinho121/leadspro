
import { supabase } from '../lib/supabase';


export class CampaignService {

    /**
     * Inicia uma campanha de disparo em massa — versão otimizada com batch fetch e IA por lead
     */
    static async startCampaign(
        tenantId: string,
        campaignId: string,
        leadIds: string[],
        options?: { useAI?: boolean; apiKeys?: any }
    ) {
        try {
            console.log(`[CampaignService] Iniciando campanha ${campaignId} com ${leadIds.length} leads...`);

            // 1. Buscar campanha
            const { data: campaign, error: campError } = await supabase
                .from('outreach_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (campError) throw new Error(`Erro ao buscar campanha: ${campError.message}`);
            if (!campaign) throw new Error('Campanha não encontrada no banco');

            // 2. Marcar como running imediatamente
            const { error: updateErr } = await supabase
                .from('outreach_campaigns')
                .update({ status: 'running', total_leads: leadIds.length })
                .eq('id', campaignId);

            if (updateErr) console.warn('[CampaignService] Aviso ao atualizar status:', updateErr.message);

            // 3. BATCH FETCH: buscar todos os leads de uma vez (não serial)
            const { data: leads, error: leadsError } = await supabase
                .from('leads')
                .select('id, name, phone, email, industry, location, ai_insights, website')
                .in('id', leadIds);

            if (leadsError) throw new Error(`Erro ao buscar leads: ${leadsError.message}`);
            console.log(`[CampaignService] ${leads?.length ?? 0} leads encontrados`);

            if (!leads || leads.length === 0) {
                await supabase.from('outreach_campaigns').update({ status: 'completed' }).eq('id', campaignId);
                return { success: true, count: 0 };
            }

            const queueItems: any[] = [];
            let delaySeconds = 0;

            for (const lead of leads) {
                let content: string;
                let subject: string | undefined;

                const useAI = options?.useAI ?? campaign.use_ai_personalization ?? false;

                if (useAI && lead.ai_insights) {
                    // Geração com IA será feita no worker server-side (não no browser)
                    // Aqui marcamos com flag para o worker processar
                    content = `__AI_GENERATE__::${JSON.stringify({ lead_id: lead.id, channel: campaign.channel })}`;
                } else {
                    // Template clássico com variáveis
                    content = (campaign.template_content || '')
                        .replace(/\$\{name\}/g, lead.name || 'você')
                        .replace(/\$\{industry\}/g, lead.industry || 'seu setor')
                        .replace(/\$\{location\}/g, lead.location || 'sua região')
                        .replace(/\$\{website\}/g, lead.website || '');

                    subject = campaign.template_subject
                        ? campaign.template_subject
                            .replace(/\$\{name\}/g, lead.name || 'você')
                            .replace(/\$\{industry\}/g, lead.industry || 'seu setor')
                        : undefined;
                }

                // Delay acumulativo para espaçar envios (30s a 90s entre cada um)
                // O anti-ban real (2-5min) é feito pelo WORKER, não aqui
                const humanizedDelay = 30 + Math.round(Math.random() * 60); // 30-90s entre cada mensagem
                delaySeconds += humanizedDelay;

                const scheduleDate = new Date();
                scheduleDate.setSeconds(scheduleDate.getSeconds() + delaySeconds);

                queueItems.push({
                    tenant_id: tenantId,
                    campaign_id: campaignId,
                    lead_id: lead.id,
                    channel: campaign.channel,
                    subject: subject || null,
                    content,
                    status: 'pending',
                    scheduled_for: scheduleDate.toISOString(),
                    max_retries: 3,
                    retry_count: 0,
                    next_retry_at: scheduleDate.toISOString(),
                    metadata: {
                        ab_variant: campaign.ab_testing_enabled
                            ? CampaignService.selectABVariant(campaign.ab_variants)
                            : null
                    }
                });
            }

            // 4. Inserção em massa com chunks de 100 (limite do Supabase)
            const chunkSize = 100;
            for (let i = 0; i < queueItems.length; i += chunkSize) {
                const chunk = queueItems.slice(i, i + chunkSize);
                const { error: insertError } = await supabase.from('message_queue').insert(chunk);
                if (insertError) {
                    console.error('[CampaignService] Erro ao inserir na fila:', insertError);
                    throw new Error(`Erro ao enfileirar mensagens: ${insertError.message}`);
                }
            }

            console.log(`[CampaignService] ✅ ${queueItems.length} mensagens enfileiradas com sucesso!`);
            return { success: true, count: queueItems.length, estimated_duration_minutes: Math.round(delaySeconds / 60) };

        } catch (error: any) {
            console.error('[CampaignService] Erro ao iniciar campanha:', error);
            // Tentar reverter para draft
            try {
                await supabase.from('outreach_campaigns').update({ status: 'draft' }).eq('id', campaignId);
            } catch (_) { }
            // IMPORTANTE: re-throw para que a UI exiba o erro ao usuário
            throw error;
        }
    }

    /**
     * Pausa uma campanha — marca mensagens pendentes como scheduled para não serem processadas
     */
    static async pauseCampaign(campaignId: string) {
        await supabase
            .from('outreach_campaigns')
            .update({ status: 'paused' })
            .eq('id', campaignId);

        await supabase
            .from('message_queue')
            .update({ status: 'paused' })
            .eq('campaign_id', campaignId)
            .eq('status', 'pending');
    }

    /**
     * Retoma uma campanha pausada
     */
    static async resumeCampaign(campaignId: string) {
        await supabase
            .from('outreach_campaigns')
            .update({ status: 'running' })
            .eq('id', campaignId);

        await supabase
            .from('message_queue')
            .update({ status: 'pending' })
            .eq('campaign_id', campaignId)
            .eq('status', 'paused');
    }

    /**
     * Exclui uma campanha e limpa toda sua fila
     */
    static async deleteCampaign(campaignId: string) {
        await supabase.from('message_queue').delete().eq('campaign_id', campaignId);
        const { error } = await supabase.from('outreach_campaigns').delete().eq('id', campaignId);
        if (error) throw error;
        return { success: true };
    }

    /**
     * Busca métricas detalhadas de uma campanha
     */
    static async getCampaignAnalytics(campaignId: string) {
        const [campaignRes, queueRes, logsRes] = await Promise.all([
            supabase.from('outreach_campaigns').select('*').eq('id', campaignId).single(),
            supabase.from('message_queue').select('status').eq('campaign_id', campaignId),
            supabase.from('automation_execution_logs').select('event_type, status').eq('automation_id', campaignId)
        ]);

        const campaign = campaignRes.data;
        const queueItems = queueRes.data || [];
        const logs = logsRes.data || [];

        const sent = queueItems.filter(q => q.status === 'sent').length;
        const failed = queueItems.filter(q => q.status === 'failed').length;
        const pending = queueItems.filter(q => q.status === 'pending').length;
        const total = queueItems.length;

        const sentLogs = logs.filter(l => l.event_type === 'message_sent' && l.status === 'success').length;
        const replyLogs = logs.filter(l => l.event_type === 'reply_received').length;

        return {
            campaign,
            metrics: {
                total,
                sent,
                failed,
                pending,
                delivery_rate: total > 0 ? Math.round((sent / total) * 100) : 0,
                reply_rate: sent > 0 ? Math.round((replyLogs / sent) * 100) : 0,
                error_rate: total > 0 ? Math.round((failed / total) * 100) : 0,
            }
        };
    }

    /**
     * Seleciona variant para A/B testing
     */
    private static selectABVariant(variants: any[]): string | null {
        if (!variants || variants.length === 0) return null;
        const rand = Math.random() * 100;
        let accumulated = 0;
        for (const v of variants) {
            accumulated += v.allocation_percent || 0;
            if (rand <= accumulated) return v.id;
        }
        return variants[0]?.id || null;
    }
}
