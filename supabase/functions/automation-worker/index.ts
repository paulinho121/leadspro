
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log("🤖 Iniciando processamento de cadências neurais...");

        // 1. Buscar inscrições pendentes
        const { data: enrollments, error: fetchError } = await supabaseClient
            .from('sequence_enrollments')
            .select(`
        *,
        lead:leads(*),
        sequence:outreach_sequences(*)
      `)
            .eq('status', 'active')
            .lte('next_action_at', new Date().toISOString());

        if (fetchError) throw fetchError;

        console.log(`[Worker] Encontradas ${enrollments?.length || 0} ações pendentes.`);

        const results = [];

        for (const enrollment of (enrollments || [])) {
            try {
                const stepIndex = enrollment.current_step;
                const steps = enrollment.sequence.steps;
                const currentStep = steps[stepIndex];

                if (!currentStep) {
                    // Marcar como concluída se não houver mais passos
                    await supabaseClient
                        .from('sequence_enrollments')
                        .update({ status: 'completed' })
                        .eq('id', enrollment.id);
                    continue;
                }

                console.log(`[Processing] Lead: ${enrollment.lead.name} | Step: ${stepIndex + 1}`);

                // 2. Gerar Notificação para o Usuário
                // Em um sistema full auto, aqui enviaríamos o e-mail/whatsapp via API.
                // Como o LeadPro prioriza o "Hand-off" humano, vamos gerar a tarefa.

                await supabaseClient
                    .from('notifications')
                    .insert([{
                        tenant_id: enrollment.tenant_id,
                        title: `🚀 Ação Recomendada: ${enrollment.sequence.name}`,
                        message: `Etapa ${stepIndex + 1} para ${enrollment.lead.name} está pronta. Clique para revisar e enviar via ${currentStep.channel.toUpperCase()}.`,
                        type: 'action',
                        data: {
                            lead_id: enrollment.lead.id,
                            enrollment_id: enrollment.id,
                            channel: currentStep.channel
                        }
                    }]);

                // 3. Atualizar Inscrição para o próximo passo
                const nextStep = steps[stepIndex + 1];
                const updateData: any = {
                    current_step: stepIndex + 1,
                    last_action_at: new Date().toISOString(),
                };

                if (nextStep) {
                    const nextDate = new Date();
                    nextDate.setDate(nextDate.getDate() + nextStep.delay_days);
                    updateData.next_action_at = nextDate.toISOString();
                } else {
                    updateData.status = 'completed';
                }

                await supabaseClient
                    .from('sequence_enrollments')
                    .update(updateData)
                    .eq('id', enrollment.id);

                results.push({ id: enrollment.id, status: 'processed' });
            } catch (err) {
                console.error(`[Error] Falha ao processar enrollment ${enrollment.id}:`, err);
            }
        }

        return new Response(JSON.stringify({ success: true, processed: results.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
