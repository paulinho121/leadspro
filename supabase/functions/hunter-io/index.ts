import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const body = await req.json().catch(() => ({}));
        const { domain, apiKey } = body;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "HUNTER_API_KEY_MISSING" }), { headers: corsHeaders, status: 400 });
        }

        if (!domain) {
            return new Response(JSON.stringify({ data: { emails: [] } }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
        }

        const baseUrl = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${apiKey}`;

        console.log(`[Hunter Proxy] Callting ${baseUrl.replace(apiKey, '***')}`);

        const response = await fetch(baseUrl);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Hunter Proxy] Erro Hunter: ${response.status} ${errorBody}`);
            return new Response(JSON.stringify({ error: `Hunter Error: ${response.status} - ${errorBody}` }), { headers: corsHeaders, status: response.status });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("[Hunter Proxy] Erro interno:", err.message);
        return new Response(JSON.stringify({ error: `Erro de rede/proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
