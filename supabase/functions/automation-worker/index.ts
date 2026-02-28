
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

// ============================================================
// LEADFLOW PRO — AUTOMATION WORKER v3.0
// Engine de Execução: 24/7, Server-Side, Anti-Ban Inteligente
// ============================================================

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    try {
        console.log("🤖 [Worker v3.0] Iniciando rodada de processamento...");

        const results: any = { sequences: 0, tasks: 0, messages: 0, errors: 0 };

        // Rodar as 3 partes em paralelo para máxima performance
        const [seqResult, taskResult, msgResult] = await Promise.allSettled([
            processSequences(supabase),
            processBackgroundTasks(supabase),
            processMessageQueue(supabase),
        ]);

        if (seqResult.status === 'fulfilled') results.sequences = seqResult.value;
        else { console.error('[Worker] Erro em sequences:', seqResult.reason); results.errors++; }

        if (taskResult.status === 'fulfilled') results.tasks = taskResult.value;
        else { console.error('[Worker] Erro em tasks:', taskResult.reason); results.errors++; }

        if (msgResult.status === 'fulfilled') results.messages = msgResult.value;
        else { console.error('[Worker] Erro em messages:', msgResult.reason); results.errors++; }

        // Atualizar timestamp de última execução
        await supabase.from('worker_health').upsert([{
            id: 'main-worker',
            last_run_at: new Date().toISOString(),
            last_results: results,
            status: results.errors > 0 ? 'degraded' : 'healthy'
        }], { onConflict: 'id' });

        console.log("✅ [Worker v3.0] Concluído:", results);

        return new Response(JSON.stringify({ success: true, results }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[Worker v3.0] Erro fatal:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})

// ============================================================
// PARTE 1: CADÊNCIAS SEQUENCIAIS — executa steps vencidos
// ============================================================

async function processSequences(supabase: any): Promise<number> {
    const { data: enrollments, error } = await supabase
        .from('sequence_enrollments')
        .select(`*, lead:leads(*), sequence:outreach_sequences(*)`)
        .eq('status', 'active')
        .lte('next_action_at', new Date().toISOString())
        .limit(20);

    if (error) throw error;
    if (!enrollments || enrollments.length === 0) return 0;

    let processed = 0;

    for (const enrollment of enrollments) {
        try {
            const stepIndex = enrollment.current_step;
            const steps = enrollment.sequence?.steps || [];
            const currentStep = steps[stepIndex];

            if (!currentStep) {
                // Cadência completa
                await supabase.from('sequence_enrollments')
                    .update({ status: 'completed', completed_at: new Date().toISOString() })
                    .eq('id', enrollment.id);
                continue;
            }

            // Verificar janela de envio humanizada (8h-20h no horário local do lead)
            if (!isWithinSendingWindow()) {
                console.log(`[Sequences] Fora da janela de envio para ${enrollment.lead?.name}. Pulando.`);
                continue;
            }

            const lead = enrollment.lead;
            const contactId = currentStep.channel === 'whatsapp' ? lead?.phone : lead?.email;

            if (contactId) {
                // Gerar mensagem com IA para este step específico
                let content = currentStep.template || '';
                if (!content && lead) {
                    content = await generateAIMessage(supabase, lead, currentStep.channel, enrollment.tenant_id);
                }

                // Adicionar à fila de mensagens com delay humanizado
                const delay = getHumanizedDelaySeconds();
                const scheduledAt = new Date();
                scheduledAt.setSeconds(scheduledAt.getSeconds() + delay);

                await supabase.from('message_queue').insert([{
                    tenant_id: enrollment.tenant_id,
                    lead_id: lead.id,
                    channel: currentStep.channel,
                    content,
                    status: 'pending',
                    scheduled_for: scheduledAt.toISOString(),
                    metadata: { source: 'sequence', enrollment_id: enrollment.id, step: stepIndex }
                }]);
            }

            // Avançar para o próximo step
            const nextStep = steps[stepIndex + 1];
            const updateData: any = {
                current_step: stepIndex + 1,
                last_action_at: new Date().toISOString(),
            };

            if (nextStep) {
                const nextDate = new Date();
                nextDate.setDate(nextDate.getDate() + (nextStep.delay_days || 1));
                updateData.next_action_at = nextDate.toISOString();
            } else {
                updateData.status = 'completed';
                updateData.completed_at = new Date().toISOString();
            }

            // FIX CRÍTICO: estava '.eq(enrollment.id)' sem o campo 'id'
            await supabase.from('sequence_enrollments').update(updateData).eq('id', enrollment.id);

            // Notificar o usuário sobre o progresso da cadência
            await supabase.from('notifications').insert([{
                tenant_id: enrollment.tenant_id,
                title: `📨 Cadência: ${enrollment.sequence?.name}`,
                message: `Etapa ${stepIndex + 1} enviada para ${lead?.name || 'lead'}`,
                type: 'sequence_step',
                data: { lead_id: lead?.id, step: stepIndex, enrollment_id: enrollment.id }
            }]);

            processed++;
        } catch (err) {
            console.error(`[Sequences] Erro na cadência ${enrollment.id}:`, err);
            await logEvent(supabase, {
                tenant_id: enrollment.tenant_id,
                automation_id: enrollment.sequence_id,
                lead_id: enrollment.lead_id,
                event_type: 'error',
                status: 'failure',
                details: { error: err.message, step: enrollment.current_step }
            });
        }
    }

    return processed;
}

// ============================================================
// PARTE 2: TAREFAS DE FUNDO (ENRICH_BATCH, AUTOMATION_RULES)
// ============================================================

async function processBackgroundTasks(supabase: any): Promise<number> {
    const { data: tasks, error } = await supabase
        .from('background_tasks')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(15);

    if (error) throw error;
    if (!tasks || tasks.length === 0) return 0;

    let processed = 0;

    for (const task of tasks) {
        try {
            await supabase.from('background_tasks')
                .update({ status: 'processing', started_at: new Date().toISOString() })
                .eq('id', task.id);

            if (task.type === 'ENRICH_BATCH') {
                await processEnrichBatch(supabase, task);
            } else if (task.type === 'PROCESS_AUTOMATION_RULE') {
                await processAutomationRules(supabase, task);
            } else if (task.type === 'WORKFLOW_EXECUTE') {
                await processWorkflowExecution(supabase, task);
            }

            await supabase.from('background_tasks')
                .update({ status: 'completed', completed_at: new Date().toISOString() })
                .eq('id', task.id);

            processed++;
        } catch (err) {
            console.error(`[Tasks] Erro na tarefa ${task.id} (${task.type}):`, err);
            const retryCount = (task.retry_count || 0) + 1;
            const canRetry = retryCount < 3;

            await supabase.from('background_tasks').update({
                status: canRetry ? 'pending' : 'failed',
                retry_count: retryCount,
                error_message: err.message,
            }).eq('id', task.id);
        }
    }

    return processed;
}

// ============================================================
// PARTE 3: FILA DE MENSAGENS com Multi-Provider e Retry
// ============================================================

async function processMessageQueue(supabase: any): Promise<number> {
    const now = new Date().toISOString();

    const { data: messages, error } = await supabase
        .from('message_queue')
        .select(`*, lead:leads(name, phone, email)`)
        .or(`and(status.eq.pending,scheduled_for.lte.${now}),and(status.eq.failed,retry_count.lt.max_retries,next_retry_at.lte.${now})`)
        .limit(15);

    if (error) throw error;
    if (!messages || messages.length === 0) return 0;

    // Buscar todas as configurações de providers em batch (não serial)
    const tenantIds = [...new Set(messages.map((m: any) => m.tenant_id))];
    const { data: allSettings } = await supabase
        .from('communication_settings')
        .select('*')
        .in('tenant_id', tenantIds)
        .eq('is_active', true);

    const settingsByTenant = groupBy(allSettings || [], 'tenant_id');

    let processed = 0;

    for (const msg of messages) {
        try {
            // Mark as processing para evitar duplo processamento
            await supabase.from('message_queue')
                .update({ status: 'processing' })
                .eq('id', msg.id);

            const tenantSettings = settingsByTenant[msg.tenant_id] || [];
            const contact = msg.channel === 'whatsapp' ? msg.lead?.phone : msg.lead?.email;

            if (!contact) {
                await supabase.from('message_queue').update({
                    status: 'failed',
                    error_message: 'Lead sem contato (phone/email)'
                }).eq('id', msg.id);
                continue;
            }

            // Verificar limite diário anti-ban antes de enviar
            const dailyCount = await getDailyMessageCount(supabase, msg.tenant_id, msg.channel);
            const limit = msg.channel === 'whatsapp' ? 150 : 500;
            if (dailyCount >= limit) {
                console.warn(`[Queue] Limite diário de ${msg.channel} atingido para tenant ${msg.tenant_id}. Postergando.`);
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                tomorrow.setHours(8, 0, 0, 0);
                await supabase.from('message_queue').update({
                    status: 'pending',
                    scheduled_for: tomorrow.toISOString()
                }).eq('id', msg.id);
                continue;
            }

            const success = await dispatchMessage(msg, contact, tenantSettings);

            if (success) {
                await supabase.from('message_queue').update({
                    status: 'sent',
                    sent_at: new Date().toISOString(),
                    error_message: null
                }).eq('id', msg.id);

                // Incrementar stats da campanha
                if (msg.campaign_id) {
                    await supabase.rpc('increment_campaign_processed', { campaign_id: msg.campaign_id });
                }

                // Registrar no log de engajamento
                await logEvent(supabase, {
                    tenant_id: msg.tenant_id,
                    automation_id: msg.campaign_id,
                    lead_id: msg.lead_id,
                    event_type: 'message_sent',
                    status: 'success',
                    details: { channel: msg.channel, contact, message_id: msg.id }
                });

                processed++;
            } else {
                throw new Error('Provider retornou status de falha');
            }

        } catch (err) {
            const newRetryCount = (msg.retry_count || 0) + 1;
            const maxRetries = msg.max_retries || 3;
            const backoffMinutes = 5 * Math.pow(newRetryCount, 2); // Exponential backoff: 5, 20, 45 min
            const nextRetryAt = new Date();
            nextRetryAt.setMinutes(nextRetryAt.getMinutes() + backoffMinutes);

            await supabase.from('message_queue').update({
                status: newRetryCount >= maxRetries ? 'failed' : 'pending',
                retry_count: newRetryCount,
                next_retry_at: newRetryCount >= maxRetries ? null : nextRetryAt.toISOString(),
                scheduled_for: newRetryCount >= maxRetries ? null : nextRetryAt.toISOString(),
                error_message: err.message,
            }).eq('id', msg.id);

            await logEvent(supabase, {
                tenant_id: msg.tenant_id,
                automation_id: msg.campaign_id,
                lead_id: msg.lead_id,
                event_type: 'error',
                status: newRetryCount >= maxRetries ? 'failure' : 'retry_scheduled',
                details: { error: err.message, retry: newRetryCount, backoff_minutes: backoffMinutes }
            });
        }
    }

    return processed;
}

// ============================================================
// DISPATCHER — Multi-Provider com Fallback
// ============================================================

async function dispatchMessage(msg: any, contact: string, settings: any[]): Promise<boolean> {
    if (msg.channel === 'whatsapp') {
        return await sendWhatsApp(msg, contact, settings);
    } else {
        return await sendEmail(msg, contact, settings);
    }
}

async function sendWhatsApp(msg: any, phone: string, settings: any[]): Promise<boolean> {
    // Tentar provedores na ordem: Evolution → Z-API → Duilio
    const providers = ['whatsapp_evolution', 'whatsapp_zapi', 'whatsapp_duilio'];

    for (const providerType of providers) {
        const setting = settings.find((s: any) => s.provider_type === providerType && s.tenant_id === msg.tenant_id);
        if (!setting) continue;

        try {
            let res: Response;

            if (providerType === 'whatsapp_evolution') {
                res = await fetch(`${setting.api_url}/message/sendText/${setting.instance_name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': setting.api_key || '' },
                    body: JSON.stringify({ number: phone, text: msg.content })
                });
            } else if (providerType === 'whatsapp_zapi') {
                const headers: any = { 'Content-Type': 'application/json' };
                if (setting.client_token) headers['Client-Token'] = setting.client_token;
                res = await fetch(`https://api.z-api.io/instances/${setting.instance_name}/token/${setting.api_key}/send-text`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ phone, message: msg.content })
                });
            } else { // duilio
                res = await fetch('https://api.duilio.com.br/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${setting.api_key}` },
                    body: JSON.stringify({ to: phone, text: msg.content })
                });
            }

            if (res.ok) return true;
            console.warn(`[Dispatch] Provider ${providerType} falhou com status ${res.status}. Tentando próximo...`);
        } catch (e) {
            console.warn(`[Dispatch] Provider ${providerType} lançou erro:`, e);
        }
    }

    return false; // Todos os providers falharam
}

async function sendEmail(msg: any, email: string, settings: any[]): Promise<boolean> {
    const setting = settings.find((s: any) => s.provider_type === 'email_resend' && s.tenant_id === msg.tenant_id);
    if (!setting) throw new Error('Provedor de email não configurado');

    const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${setting.api_key}` },
        body: JSON.stringify({
            from: setting.from_email || 'LeadPro <onboarding@resend.dev>',
            to: email,
            subject: msg.subject || 'Nova Oportunidade',
            html: msg.content
        })
    });

    return res.ok;
}

// ============================================================
// PROCESSADORES DE TAREFAS ESPECÍFICAS
// ============================================================

async function processEnrichBatch(supabase: any, task: any) {
    const { payload, tenant_id } = task;
    const leadIds = payload.leads_ids || [];

    const { data: config } = await supabase
        .from('white_label_configs')
        .select('api_keys')
        .eq('tenant_id', tenant_id)
        .single();

    const serperKey = config?.api_keys?.serper || Deno.env.get('SERPER_API_KEY');
    const geminiKey = config?.api_keys?.gemini || Deno.env.get('GEMINI_API_KEY');

    // Buscar todos os leads em batch (não serial)
    const { data: leads } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

    if (!leads) return;

    for (const lead of leads) {
        try {
            let searchData = null;
            let insights = '';

            if (serperKey) {
                const res = await fetch('https://google.serper.dev/search', {
                    method: 'POST',
                    headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ q: `${lead.name} ${lead.location} site empresa` })
                });
                searchData = await res.json();
            }

            if (geminiKey) {
                const prompt = `Você é um analista de vendas B2B. Analise comercialmente esta empresa e gere insights de dor e oportunidade:
                Empresa: ${lead.name}
                Setor: ${lead.industry}
                Localização: ${lead.location}
                Contexto web: ${JSON.stringify(searchData?.organic?.slice(0, 3) || 'Sem dados')}
                
                Retorne em 3-4 linhas: principais dores do setor, oportunidade de venda, e tom de abordagem ideal.`;

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                const data = await res.json();
                insights = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            await supabase.from('leads').update({
                status: 'ENRICHED',
                ai_insights: insights,
                updated_at: new Date().toISOString()
            }).eq('id', lead.id);

            await supabase.from('api_usage_logs').insert([{
                tenant_id,
                api_name: 'neural_batch_worker',
                credits_used: 10
            }]);

        } catch (e) {
            console.error(`[EnrichBatch] Erro no lead ${lead.id}:`, e);
        }
    }
}

async function processAutomationRules(supabase: any, task: any) {
    const { tenant_id, payload } = task;
    const { lead_id, analysis, trigger_type } = payload;

    const { data: rules } = await supabase
        .from('automation_rules')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('trigger_type', trigger_type)
        .eq('is_active', true)
        .order('created_at', { ascending: true }); // Executar na ordem de criação

    if (!rules || rules.length === 0) return;

    for (const rule of rules) {
        try {
            const shouldExecute = evaluateConditions(analysis, rule.conditions);

            await logEvent(supabase, {
                tenant_id,
                automation_id: rule.id,
                lead_id,
                event_type: 'condition_checked',
                status: shouldExecute ? 'success' : 'skipped',
                details: { conditions: rule.conditions, analysis, result: shouldExecute }
            });

            if (shouldExecute) {
                await executeAutomationAction(supabase, tenant_id, lead_id, rule);
            }
        } catch (e) {
            console.error(`[Automation] Erro na regra ${rule.id}:`, e);
        }
    }
}

async function processWorkflowExecution(supabase: any, task: any) {
    const { tenant_id, payload } = task;
    const { workflow_id, trigger_data } = payload;

    const { data: workflow } = await supabase
        .from('visual_workflows')
        .select('*')
        .eq('id', workflow_id)
        .single();

    if (!workflow || !workflow.nodes) return;

    // Encontrar o nó de entrada (triggerNode)
    const startNode = workflow.nodes.find((n: any) => n.type === 'triggerNode');
    if (!startNode) return;

    await traverseWorkflow(supabase, tenant_id, startNode, workflow, trigger_data);
}

async function traverseWorkflow(supabase: any, tenantId: string, node: any, workflow: any, data: any) {
    console.log(`[WorkflowEngine] Executando node: ${node.type} - ${node.data?.label}`);

    let result = data;

    if (node.type === 'brainNode') {
        // Executar análise de IA
        result = { ...data, ai_analysis: 'processed' };
    } else if (node.type === 'actionNode') {
        // Executar ação (ex: enviar WhatsApp, mover stage)
        if (data.lead_id && data.channel) {
            await supabase.from('message_queue').insert([{
                tenant_id: tenantId,
                lead_id: data.lead_id,
                channel: data.channel || 'whatsapp',
                content: node.data?.message || 'Mensagem automática do workflow.',
                status: 'pending',
                metadata: { source: 'visual_workflow', node_id: node.id }
            }]);
        }
    }

    // Continuar com o próximo nó conectado
    const nextEdge = workflow.edges?.find((e: any) => e.source === node.id);
    if (nextEdge) {
        const nextNode = workflow.nodes.find((n: any) => n.id === nextEdge.target);
        if (nextNode) await traverseWorkflow(supabase, tenantId, nextNode, workflow, result);
    }
}

// ============================================================
// AÇÕES DE AUTOMAÇÃO
// ============================================================

async function executeAutomationAction(supabase: any, tenantId: string, leadId: string, rule: any) {
    const { action_type, action_payload, id: ruleId } = rule;

    await logEvent(supabase, {
        tenant_id: tenantId,
        automation_id: ruleId,
        lead_id: leadId,
        event_type: 'action_executed',
        status: 'processing',
        details: { action: action_type }
    });

    switch (action_type) {
        case 'send_reply': {
            const delay = getHumanizedDelaySeconds();
            const scheduledAt = new Date();
            scheduledAt.setSeconds(scheduledAt.getSeconds() + delay);

            await supabase.from('message_queue').insert([{
                tenant_id: tenantId,
                lead_id: leadId,
                channel: 'whatsapp',
                content: action_payload.template || 'Olá! Como posso ajudar você hoje?',
                status: 'pending',
                scheduled_for: scheduledAt.toISOString(),
                metadata: { source: 'automation_rule', rule_id: ruleId }
            }]);
            break;
        }

        case 'move_stage':
            await supabase.from('leads')
                .update({ status: action_payload.new_status || 'ENRICHED' })
                .eq('id', leadId);
            break;

        case 'notify_admin': {
            const { data: lead } = await supabase.from('leads').select('name').eq('id', leadId).single();
            await supabase.from('notifications').insert([{
                tenant_id: tenantId,
                title: '🚨 Lead Requer Atenção',
                message: `${lead?.name || 'Um lead'} está pronto para abordagem humana.`,
                type: 'admin_alert',
                data: { lead_id: leadId, rule_id: ruleId }
            }]);
            break;
        }

        case 'enroll_sequence': {
            if (action_payload.sequence_id) {
                const firstStepDelay = 1;
                const nextActionDate = new Date();
                nextActionDate.setDate(nextActionDate.getDate() + firstStepDelay);

                await supabase.from('sequence_enrollments').upsert([{
                    tenant_id: tenantId,
                    lead_id: leadId,
                    sequence_id: action_payload.sequence_id,
                    status: 'active',
                    current_step: 0,
                    next_action_at: nextActionDate.toISOString()
                }], { onConflict: 'lead_id,sequence_id' });
            }
            break;
        }
    }

    await logEvent(supabase, {
        tenant_id: tenantId,
        automation_id: ruleId,
        lead_id: leadId,
        event_type: 'action_executed',
        status: 'success',
        details: { action: action_type, payload: action_payload }
    });
}

// ============================================================
// GERAÇÃO DE MENSAGEM COM IA
// ============================================================

async function generateAIMessage(supabase: any, lead: any, channel: string, tenantId: string): Promise<string> {
    try {
        const { data: config } = await supabase
            .from('white_label_configs')
            .select('api_keys')
            .eq('tenant_id', tenantId)
            .single();

        const geminiKey = config?.api_keys?.gemini || Deno.env.get('GEMINI_API_KEY');
        if (!geminiKey) throw new Error('Sem chave Gemini');

        const channelGuide = channel === 'whatsapp'
            ? 'Curto, 2-3 parágrafos, emojis moderados, direto ao ponto.'
            : 'Assunto impactante + corpo profissional e estruturado, máx 5 parágrafos.';

        const prompt = `Você é um SDR de alta performance. Crie uma mensagem de prospecção personalizada:

Empresa: ${lead.name}
Setor: ${lead.industry || 'Negócio local'}
Local: ${lead.location || 'Brasil'}
Insights: ${lead.ai_insights || 'Empresa com potencial de crescimento'}
Canal: ${channel.toUpperCase()}

DIRETRIZES:
- ${channelGuide}
- Mencione uma dor específica do setor ${lead.industry || 'deles'}
- Gere curiosidade sem revelar tudo
- Call-to-action claro no final
- NÃO use placeholders como [Nome]
- Tom: profissional mas amigável

RETORNE APENAS O TEXTO DA MENSAGEM, SEM ASPAS OU EXPLICAÇÕES.`;

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || getFallbackMessage(lead, channel);
    } catch (e) {
        console.error('[GenerateAI] Falha ao gerar mensagem com IA:', e);
        return getFallbackMessage(lead, channel);
    }
}

function getFallbackMessage(lead: any, channel: string): string {
    if (channel === 'whatsapp') {
        return `Olá! Vi que a ${lead.name} é referência em ${lead.industry || 'seu setor'}. Temos uma solução que pode acelerar seus resultados. Posso compartilhar mais detalhes?`;
    }
    return `Olá,\n\nVi o trabalho da ${lead.name} em ${lead.location} e acredito que temos muito a agregar ao seu negócio.\n\nPodemos agendar uma breve conversa?\n\nAté logo!`;
}

// ============================================================
// UTILITÁRIOS: Anti-Ban, Janela de Envio, Helpers
// ============================================================

function isWithinSendingWindow(): boolean {
    const now = new Date();
    const hour = now.getUTCHours() - 3; // Ajuste para UTC-3 (Brasil)
    const adjustedHour = (hour + 24) % 24;
    return adjustedHour >= 8 && adjustedHour < 20; // 8h às 20h
}

function getHumanizedDelaySeconds(): number {
    // Delay entre 30s e 180s com distribuição natural
    const base = 60; // 1 minuto base
    const jitter = (Math.random() - 0.5) * 90;
    return Math.max(30, Math.round(base + jitter));
}

async function getDailyMessageCount(supabase: any, tenantId: string, channel: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
        .from('message_queue')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('channel', channel)
        .in('status', ['sent', 'processing'])
        .gte('sent_at', today.toISOString());

    return count || 0;
}

function evaluateConditions(analysis: any, conditions: any): boolean {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    if (conditions.intent && analysis.intent !== conditions.intent) return false;
    if (conditions.sentiment && analysis.sentiment !== conditions.sentiment) return false;
    return true;
}

function groupBy(array: any[], key: string): Record<string, any[]> {
    return array.reduce((result, item) => {
        const group = item[key];
        if (!result[group]) result[group] = [];
        result[group].push(item);
        return result;
    }, {});
}

async function logEvent(supabase: any, data: {
    tenant_id: string;
    automation_id?: string;
    lead_id?: string;
    event_type: string;
    status: string;
    details?: any;
}) {
    try {
        await supabase.from('automation_execution_logs').insert([{
            tenant_id: data.tenant_id,
            automation_id: data.automation_id || null,
            lead_id: data.lead_id || null,
            event_type: data.event_type,
            status: data.status,
            details: data.details || {}
        }]);
    } catch (e) {
        console.error('[LogEvent] Falha ao registrar evento:', e);
    }
}
