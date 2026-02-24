
import { supabase } from '../lib/supabase';
import { Campaign, Deal, DealStage } from '../types';

export class RevenueService {
    /**
     * Busca todas as campanhas do Tenant
     */
    static async getCampaigns(tenantId: string): Promise<Campaign[]> {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Busca todos os Deals do Tenant com dados dos Leads
     */
    static async getDeals(tenantId: string): Promise<Deal[]> {
        const { data, error } = await supabase
            .from('deals')
            .select('*, lead:leads(*)')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Cria um novo Deal (Oportunidade) a partir de um Lead
     */
    static async createDeal(tenantId: string, leadId: string, campaignId?: string, estimatedValue: number = 0): Promise<Deal> {
        const { data, error } = await supabase
            .from('deals')
            .insert([{
                tenant_id: tenantId,
                lead_id: leadId,
                campaign_id: campaignId,
                estimated_value: estimatedValue,
                probability_to_close: 0.10, // Default inicial
                stage: DealStage.DISCOVERY,
                status: 'open'
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Atualiza o estágio de um Deal e registra no histórico
     */
    static async updateDealStage(dealId: string, newStage: DealStage, userId?: string): Promise<void> {
        const { data: oldDeal } = await supabase.from('deals').select('stage').eq('id', dealId).single();

        const { error } = await supabase
            .from('deals')
            .update({
                stage: newStage,
                updated_at: new Date().toISOString(),
                closed_at: (newStage === DealStage.WON || newStage === DealStage.LOST) ? new Date().toISOString() : null,
                status: (newStage === DealStage.WON) ? 'won' : (newStage === DealStage.LOST ? 'lost' : 'open')
            })
            .eq('id', dealId);

        if (error) throw error;

        // Registrar histórico
        await supabase.from('deal_stages_history').insert([{
            deal_id: dealId,
            from_stage: oldDeal?.stage,
            to_stage: newStage,
            changed_by: userId
        }]);
    }

    /**
     * Calcula o valor total do pipeline (Soma ponderada pela probabilidade)
     */
    static async getPipelineValue(tenantId: string): Promise<{ total: number, weighted: number }> {
        const { data, error } = await supabase
            .from('deals')
            .select('estimated_value, probability_to_close')
            .eq('tenant_id', tenantId)
            .eq('status', 'open');

        if (error) throw error;

        const total = data.reduce((acc, d) => acc + Number(d.estimated_value), 0);
        const weighted = data.reduce((acc, d) => acc + (Number(d.estimated_value) * Number(d.probability_to_close)), 0);

        return { total, weighted };
    }
}
