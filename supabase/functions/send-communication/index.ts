import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    // Handle CORS Preflight requests
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { channel, settings, payload } = body;

        // channel: 'whatsapp' | 'email'
        // settings: { provider_type, api_url, api_key, instance_name, client_token }
        // payload: { to: string, content: string, subject?: string }

        if (!settings || !payload) {
            return new Response(JSON.stringify({ error: "Missing settings or payload" }), { headers: corsHeaders, status: 400 });
        }

        console.log(`[Send-Communication] Channel: ${channel} | Provider: ${settings.provider_type}`);

        let response;

        if (channel === 'whatsapp') {
            if (settings.provider_type === 'whatsapp_evolution') {
                response = await fetch(`${settings.api_url}/message/sendText/${settings.instance_name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'apikey': settings.api_key || '' },
                    body: JSON.stringify({ number: payload.to, text: payload.content })
                });
            } else if (settings.provider_type === 'whatsapp_zapi') {
                const headers: any = { 'Content-Type': 'application/json' };
                if (settings.client_token) {
                    headers['Client-Token'] = settings.client_token;
                }
                response = await fetch(`https://api.z-api.io/instances/${settings.instance_name}/token/${settings.api_key}/send-text`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ phone: payload.to, message: payload.content })
                });
            } else if (settings.provider_type === 'whatsapp_duilio') {
                response = await fetch('https://api.duilio.com.br/v1/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.api_key}` },
                    body: JSON.stringify({ to: payload.to, text: payload.content })
                });
            } else if (settings.provider_type === 'whatsapp_cloud_api') {
                const version = settings.api_url || 'v17.0';
                response = await fetch(`https://graph.facebook.com/${version}/${settings.instance_name}/messages`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.api_key}`
                    },
                    body: JSON.stringify({
                        messaging_product: 'whatsapp',
                        recipient_type: 'individual',
                        to: payload.to,
                        type: 'text',
                        text: { body: payload.content }
                    })
                });
            } else {
                return new Response(JSON.stringify({ error: "Provider not supported" }), { headers: corsHeaders, status: 400 });
            }
        } else if (channel === 'email') {
            if (settings.provider_type === 'email_resend') {
                response = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${settings.api_key}`
                    },
                    body: JSON.stringify({
                        from: 'LeadFlow <onboarding@resend.dev>',
                        to: payload.to,
                        subject: payload.subject || 'Oportunidade de Negócio',
                        html: payload.content
                    })
                });
            } else {
                return new Response(JSON.stringify({ error: "Email provider not supported" }), { headers: corsHeaders, status: 400 });
            }
        } else {
            return new Response(JSON.stringify({ error: "Channel not supported" }), { headers: corsHeaders, status: 400 });
        }

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Send-Communication] Failed: ${response.status} ${errorBody}`);
            return new Response(JSON.stringify({ error: `Provider Error: HTTP ${response.status} - ${errorBody}` }), { headers: corsHeaders, status: response.status });
        }

        const data = await response.json().catch(() => ({}));

        return new Response(JSON.stringify({ success: true, data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("[Send-Communication] Erro interno:", err.message);
        return new Response(JSON.stringify({ error: `Erro de proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
