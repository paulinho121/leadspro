
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

        console.log("🤖 [Worker] Iniciando rodada de processamento...");

        const results: any = {
            sequences: 0,
            background_tasks: []
        };

        // --- PARTE 1: PROCESSAR CADÊNCIAS (Sequence Enrollments) ---
        const { data: enrollments } = await supabaseClient
            .from('sequence_enrollments')
            .select(`*, lead:leads(*), sequence:outreach_sequences(*)`)
            .eq('status', 'active')
            .lte('next_action_at', new Date().toISOString());

        if (enrollments && enrollments.length > 0) {
            console.log(`[Worker] Processando ${enrollments.length} cadências...`);
            for (const enrollment of enrollments) {
                try {
                    const stepIndex = enrollment.current_step;
                    const steps = enrollment.sequence.steps;
                    const currentStep = steps[stepIndex];

                    if (!currentStep) {
                        await supabaseClient.from('sequence_enrollments').update({ status: 'completed' }).eq('id', enrollment.id);
                        continue;
                    }

                    // Gerar Notificação
                    await supabaseClient.from('notifications').insert([{
                        tenant_id: enrollment.tenant_id,
                        title: `🚀 Ação Recomendada: ${enrollment.sequence.name}`,
                        message: `Etapa ${stepIndex + 1} para ${enrollment.lead.name} está pronta.`,
                        type: 'action',
                        data: { lead_id: enrollment.lead.id, channel: currentStep.channel }
                    }]);

                    // Atualizar próximo passo
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

                    await supabaseClient.from('sequence_enrollments').update(updateData).eq(enrollment.id);
                    results.sequences++;
                } catch (err) {
                    console.error(`[Error] Falha na cadência ${enrollment.id}:`, err);
                }
            }
        }

        // --- PARTE 2: PROCESSAR FILA DE TAREFAS (Background Tasks) ---
        // Vamos tentar processar até 3 tarefas por ciclo para não estourar o tempo
        const workerId = `worker-${Math.random().toString(36).substr(2, 9)}`;

        for (let i = 0; i < 3; i++) {
            const { data: task, error: claimError } = await supabaseClient
                .rpc('claim_background_task', { p_worker_id: workerId });

            if (claimError || !task || task.length === 0) break;

            const currentTask = task[0];
            console.log(`[Worker] Reivindicada tarefa: ${currentTask.task_type} (${currentTask.task_id})`);

            try {
                if (currentTask.task_type === 'ENRICH_BATCH') {
                    await processEnrichBatch(supabaseClient, currentTask);
                } else {
                    console.warn(`[Worker] Tipo de tarefa desconhecido: ${currentTask.task_type}`);
                }

                // Finalizar tarefa com sucesso
                await supabaseClient.from('background_tasks').update({
                    status: 'completed',
                    finished_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }).eq('id', currentTask.task_id);

                results.background_tasks.push({ id: currentTask.task_id, status: 'completed' });

            } catch (taskErr) {
                console.error(`[Worker] Falha ao processar tarefa ${currentTask.task_id}:`, taskErr);

                // Marcar como falha
                await supabaseClient.from('background_tasks').update({
                    status: 'failed',
                    error_message: taskErr.message,
                    updated_at: new Date().toISOString()
                }).eq('id', currentTask.task_id);

                results.background_tasks.push({ id: currentTask.task_id, status: 'failed', error: taskErr.message });
            }
        }

        return new Response(JSON.stringify({ success: true, results }), {
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

/**
 * Lógica de Enriquecimento em Lote (Real Neural Engine)
 */
async function processEnrichBatch(supabase: any, task: any) {
    const { task_payload, task_tenant_id } = task;
    const leadIds = task_payload.leads_ids || [];

    // 1. Buscar Chaves de API do Tenant
    const { data: config } = await supabase
        .from('white_label_configs')
        .select('api_keys')
        .eq('tenant_id', task_tenant_id)
        .single();

    const tenantKeys = config?.api_keys || {};
    const serperKey = tenantKeys.serper || Deno.env.get('SERPER_API_KEY');
    const geminiKey = tenantKeys.gemini || Deno.env.get('GEMINI_API_KEY');

    console.log(`[EnrichWorker] Processando ${leadIds.length} leads. Serper: ${!!serperKey}, Gemini: ${!!geminiKey}`);

    for (const leadId of leadIds) {
        try {
            const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).single();
            if (!lead) continue;

            let searchData = null;
            let insights = "";

            // A. Busca Serper (Opcional se falhar)
            if (serperKey) {
                try {
                    const serperRes = await fetch("https://google.serper.dev/search", {
                        method: "POST",
                        headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
                        body: JSON.stringify({ q: `${lead.name} ${lead.location}` })
                    });
                    searchData = await serperRes.json();
                } catch (e) {
                    console.error(`[Serper Error] ${lead.name}:`, e);
                }
            }

            // B. Análise Gemini
            if (geminiKey) {
                try {
                    const prompt = `Analise comercialmente esta empresa: ${lead.name} em ${lead.location}. 
                    Contexto de busca: ${JSON.stringify(searchData?.organic?.slice(0, 3) || "Sem dados de busca")}.
                    Retorne um resumo estratégico de 2 parágrafos sobre o potencial de vendas e problemas que eles podem ter (ex: site ruim, sem anúncios, etc).`;

                    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: prompt }] }]
                        })
                    });
                    const geminiData = await geminiRes.json();
                    insights = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
                } catch (e) {
                    console.error(`[Gemini Error] ${lead.name}:`, e);
                }
            }

            // C. Atualizar Lead
            await supabase.from('leads').update({
                status: 'ENRICHED',
                ai_insights: insights || "Enriquecimento concluído via worker (sem insights de IA).",
                details: {
                    ...lead.details,
                    search_raw: searchData?.organic?.[0] || null,
                    last_worker_run: new Date().toISOString()
                },
                updated_at: new Date().toISOString()
            }).eq('id', leadId);

            // D. Log de Consumo
            await supabase.from('api_usage_logs').insert([{
                tenant_id: task_tenant_id,
                api_name: 'neural_batch_worker',
                credits_used: 10
            }]);

        } catch (err) {
            console.error(`[EnrichWorker] Erro crítico no lead ${leadId}:`, err);
        }
    }
}
