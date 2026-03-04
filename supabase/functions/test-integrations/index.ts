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
        const { provider, authKey, endpoint, instanceId, clientToken } = body;

        console.log(`[Test-Integrations] Testando provedor: ${provider}`);

        if (provider === 'email_resend') {
            if (!authKey) return new Response(JSON.stringify({ ok: false, msg: "Token ausente." }), { headers: corsHeaders, status: 400 });

            // Using /emails since /domains requires specific scopes sometimes, or we can just try sending or grabbing domains
            const res = await fetch('https://api.resend.com/emails', {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${authKey}` }
            });

            // Resend returns 200 on /emails IF the token is valid, even if no emails are sent.
            if (res.ok) {
                return new Response(JSON.stringify({ ok: true, msg: "Token ativo e autenticado com a Resend." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
            } else {
                const err = await res.text();
                return new Response(JSON.stringify({ ok: false, msg: `Falha na autenticação Resend (HTTP ${res.status}): ${err}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.status });
            }
        }

        // We can add more generic proxy calls here to avoid CORS for the whatsapp providers if needed
        if (provider === 'whatsapp_evolution') {
            const url = `${endpoint.replace(/\/$/, '')}/instance/fetchInstances`;
            const res = await fetch(url, { headers: { apikey: authKey } });
            if (res.ok) return new Response(JSON.stringify({ ok: true, msg: 'Conexão validada com a Evolution API.' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            return new Response(JSON.stringify({ ok: false, msg: `Falha na Evolution API. HTTP ${res.status}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.status });
        }

        if (provider === 'whatsapp_zapi') {
            const baseUrl = endpoint || 'https://api.z-api.io';
            const url = `${baseUrl.replace(/\/$/, '')}/instances/${instanceId}/token/${authKey}/status`;
            const res = await fetch(url, {
                headers: clientToken ? { 'Client-Token': clientToken } : {}
            });
            if (res.ok) {
                const json = await res.json().catch(() => ({}));
                const connected = json?.connected ?? json?.status === 'CONNECTED';
                return new Response(JSON.stringify({
                    ok: true,
                    msg: connected ? '✅ Z-API conectada e instância ativa!' : '⚠️ Z-API acessível, mas instância pode estar desconectada.'
                }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            return new Response(JSON.stringify({ ok: false, msg: `Z-API retornou HTTP ${res.status}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.status });
        }

        if (provider === 'whatsapp_cloud_api') {
            const version = endpoint || 'v17.0';
            const res = await fetch(`https://graph.facebook.com/${version}/${instanceId}`, {
                headers: { 'Authorization': `Bearer ${authKey}` }
            });
            if (res.ok) {
                return new Response(JSON.stringify({ ok: true, msg: '✅ WhatsApp Cloud API validada com sucesso!' }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
            }
            const data = await res.json().catch(() => ({}));
            return new Response(JSON.stringify({ ok: false, msg: `Erro na Meta API: ${data.error?.message || res.statusText}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: res.status });
        }

        return new Response(JSON.stringify({ ok: false, msg: "Provedor desconhecido ou fora do escopo do proxy." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });

    } catch (err: any) {
        console.error("[Test-Integrations] Erro interno:", err.message);
        return new Response(JSON.stringify({ ok: false, msg: `Erro de servidor / proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
