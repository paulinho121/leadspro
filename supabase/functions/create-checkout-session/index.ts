
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"

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
        const { productId, tenantId } = body;

        console.log(`[Checkout] Iniciando sessão para produto ${productId}, tenant ${tenantId}`);

        if (!productId) throw new Error("Parâmetro productId é obrigatório.");
        if (!tenantId) throw new Error("Parâmetro tenantId é obrigatório.");

        const STRIPE_KEY = Deno.env.get("STRIPE_SECRET_KEY");
        if (!STRIPE_KEY) {
            console.error("[Checkout] Erro: STRIPE_SECRET_KEY não configurada no Supabase.");
            throw new Error("Serviço de pagamentos não configurado no Supabase (chave secreta ausente). Configure-a via CLI: supabase secrets set STRIPE_SECRET_KEY=sk_...");
        }

        const stripe = new Stripe(STRIPE_KEY, {
            apiVersion: "2023-10-16",
        });

        // 1. Buscar o Price ID correspondente ao Product ID no Stripe
        console.log(`[Checkout] Consultando preço para: ${productId}`);
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        });

        if (!prices.data || prices.data.length === 0) {
            console.warn(`[Checkout] Nenhum preço ativo encontrado para: ${productId}`);
            throw new Error(`Configuração do Stripe inválida: Produto ${productId} sem preço ativo ou não encontrado na conta configurada.`);
        }

        const priceId = prices.data[0].id;
        console.log(`[Checkout] Price ID encontrado: ${priceId}`);

        // 2. Criar a sessão de checkout
        console.log(`[Checkout] Criando checkout session...`);
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${req.headers.get("origin") || "http://localhost:5173"}/billing?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin") || "http://localhost:5173"}/billing`,
            metadata: {
                productId,
                tenantId,
            },
        });

        console.log(`[Checkout] Sucesso! Session ID: ${session.id}`);

        return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        console.error("[Checkout] Erro no fluxo:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            code: 'STRIPE_ERROR',
            status: 400
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
