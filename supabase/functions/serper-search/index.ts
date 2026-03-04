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
        const { endpoint, payload, apiKey } = body; // endpoint here can be 'maps' or 'search'

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "SERPER_API_KEY_MISSING" }), { headers: corsHeaders, status: 400 });
        }

        let serperUrl = 'https://google.serper.dev/search';

        let serperBody: any = {
            q: payload.q,
            gl: 'br',
            hl: 'pt-br'
        };

        if (endpoint === 'maps') {
            serperUrl = 'https://google.serper.dev/maps';

            if (payload.page > 1) {
                if (payload.ll) {
                    serperBody.page = payload.page;
                    serperBody.ll = payload.ll;
                } else {
                    serperBody.page = 1;
                }
            } else if (payload.page) {
                serperBody.page = payload.page;
            }
        }
        else if (endpoint === 'search') {
            serperBody.num = payload.num || 10;
            serperBody.page = payload.page || 1;
        }
        else {
            return new Response(JSON.stringify({ error: "INVALID_ENDPOINT" }), { headers: corsHeaders, status: 400 });
        }

        console.log(`[Serper Edge Proxy] Callting ${serperUrl}`);

        const response = await fetch(serperUrl, {
            method: 'POST',
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(serperBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Serper Proxy] Erro Serper: ${response.status} ${errorBody}`);
            return new Response(JSON.stringify({ error: `Serper Error: ${response.status} ${response.statusText} - ${errorBody}` }), { headers: corsHeaders, status: response.status });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("[Serper Proxy] Erro interno:", err.message);
        return new Response(JSON.stringify({ error: `Erro de rede/proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
