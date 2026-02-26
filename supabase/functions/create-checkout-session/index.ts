
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
})

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders })
    }

    try {
        const { productId, tenantId } = await req.json()

        // 1. Buscar o Price ID correspondente ao Product ID no Stripe
        const prices = await stripe.prices.list({
            product: productId,
            active: true,
            limit: 1,
        })

        if (!prices.data || prices.data.length === 0) {
            throw new Error("Nenhum preço ativo encontrado para este produto.")
        }

        const priceId = prices.data[0].id

        // 2. Criar a sessão de checkout
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card", "pix"],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${req.headers.get("origin")}/billing?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get("origin")}/billing`,
            metadata: {
                productId,
                tenantId,
            },
        })

        return new Response(JSON.stringify({ sessionId: session.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        })
    }
})
