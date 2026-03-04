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
        const { endpoint, prompt, apiKey, model = 'gemini-1.5-flash' } = body;

        if (!apiKey) {
            return new Response(JSON.stringify({ error: "GEMINI_API_KEY_MISSING" }), { headers: corsHeaders, status: 400 });
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:${endpoint}?key=${apiKey}`;

        console.log(`[Gemini Proxy] Post to model -> ${model}, endpoint -> ${endpoint}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.1, // Always low to avoid JSON structure breaks
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 8192,
                }
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[Gemini Proxy] HTTP ${response.status}`, errorBody);
            return new Response(JSON.stringify({ error: `Gemini API Error: HTTP ${response.status} - ${errorBody}` }), { headers: corsHeaders, status: response.status });
        }

        const data = await response.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (err: any) {
        console.error("[Gemini Proxy] Erro interno:", err.message);
        return new Response(JSON.stringify({ error: `Erro de rede/proxy: ${err.message}` }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
    }
});
