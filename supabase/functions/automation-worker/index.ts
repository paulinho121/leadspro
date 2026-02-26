
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

        // --- PARTE 3: PROCESSAR FILA DE MENSAGENS (Mass Outreach) ---
        const { data: messages } = await supabaseClient
            .from('message_queue')
            .select(`*, lead:leads(name, phone, email)`)
            .eq('status', 'pending')
            .lte('scheduled_for', new Date().toISOString())
            .limit(5);

        if (messages && messages.length > 0) {
            console.log(`[Worker] Processando ${messages.length} mensagens da fila...`);
            for (const msg of messages) {
                try {
                    // Marcar como processando
                    await supabaseClient.from('message_queue').update({ status: 'processing' }).eq('id', msg.id);

                    // Buscar configurações do provedor para o tenant
                    const { data: setting } = await supabaseClient
                        .from('communication_settings')
                        .select('*')
                        .eq('tenant_id', msg.tenant_id)
                        .eq('provider_type', msg.channel === 'whatsapp' ? 'whatsapp_evolution' : 'email_resend')
                        .eq('is_active', true)
                        .single();

                    if (!setting) {
                        throw new Error(`Provedor ${msg.channel} não configurado para o tenant ${msg.tenant_id}`);
                    }

                    let success = false;
                    const contact = msg.channel === 'whatsapp' ? msg.lead?.phone : msg.lead?.email;

                    if (!contact) throw new Error('Lead sem informação de contato');

                    if (msg.channel === 'whatsapp' && setting.provider_type === 'whatsapp_evolution') {
                        const res = await fetch(`${setting.api_url}/message/sendText/${setting.instance_name}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'apikey': setting.api_key || '' },
                            body: JSON.stringify({ number: contact, text: msg.content })
                        });
                        success = res.ok;
                    } else if (msg.channel === 'email' && setting.provider_type === 'email_resend') {
                        const res = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${setting.api_key}` },
                            body: JSON.stringify({
                                from: 'LeadPro <onboarding@resend.dev>',
                                to: contact,
                                subject: msg.subject || 'Nova Oportunidade',
                                html: msg.content
                            })
                        });
                        success = res.ok;
                    }

                    // Atualizar status
                    await supabaseClient.from('message_queue').update({
                        status: success ? 'sent' : 'failed',
                        sent_at: success ? new Date().toISOString() : null,
                        error_message: success ? null : 'Falha no envio via API'
                    }).eq('id', msg.id);

                    if (success && msg.campaign_id) {
                        await supabaseClient.rpc('increment_campaign_processed', { campaign_id: msg.campaign_id });
                    }

                } catch (err) {
                    console.error(`[Worker] Erro na mensagem ${msg.id}:`, err);
                    await supabaseClient.from('message_queue').update({
                        status: 'failed',
                        error_message: err.message
                    }).eq('id', msg.id);
                }
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
