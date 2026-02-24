
import { supabase } from '../lib/supabase';
import { OutreachSequence, SequenceStep } from '../types';

export class SequenceService {
    /**
     * Busca todas as cadências do Tenant
     */
    static async getSequences(tenantId: string): Promise<OutreachSequence[]> {
        const { data, error } = await supabase
            .from('outreach_sequences')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }

    /**
     * Inscreve um Lead em uma cadência neural
     */
    static async enrollLead(tenantId: string, leadId: string, sequenceId: string) {
        // 1. Buscar a cadência para saber o delay da primeira etapa (se houver)
        const { data: sequence } = await supabase
            .from('outreach_sequences')
            .select('steps')
            .eq('id', sequenceId)
            .single();

        const firstStepDelay = sequence?.steps?.[0]?.delay_days || 1;
        const nextActionDate = new Date();
        nextActionDate.setDate(nextActionDate.getDate() + firstStepDelay);

        // 2. Criar a inscrição
        const { error } = await supabase
            .from('sequence_enrollments')
            .upsert([{
                tenant_id: tenantId,
                lead_id: leadId,
                sequence_id: sequenceId,
                status: 'active',
                current_step: 0,
                next_action_at: nextActionDate.toISOString()
            }], { onConflict: 'lead_id, sequence_id' });

        if (error) throw error;

        // 3. Registrar log de atividade AI SDR
        await supabase
            .from('ai_sdr_interactions')
            .insert([{
                tenant_id: tenantId,
                lead_id: leadId,
                channel: 'system',
                direction: 'outbound',
                content: `🚀 Automação Iniciada: Lead inscrito na cadência #${sequenceId.split('-')[0]}`,
                ai_analysis: { type: 'enrollment', sequence_id: sequenceId, first_step_delay: firstStepDelay }
            }]);

        return true;
    }

    /**
     * Busca inscrições ativas para um lead
     */
    static async getActiveEnrollments(leadId: string) {
        const { data, error } = await supabase
            .from('sequence_enrollments')
            .select('*, sequence:outreach_sequences(*)')
            .eq('lead_id', leadId)
            .eq('status', 'active');

        if (error) throw error;
        return data;
    }
}
