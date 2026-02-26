
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import Stripe from "https://esm.sh/stripe@14.21.0"

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2023-10-16",
})

const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

serve(async (req) => {
    const signature = req.headers.get("stripe-signature")

    if (!signature) {
        return new Response("Assinatura ausente", { status: 400 })
    }

    try {
        const body = await req.text()
        const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")

        let event
        if (endpointSecret) {
            event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret)
        } else {
            event = JSON.parse(body)
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        if (event.type === "checkout.session.completed") {
            const session = event.data.object
            const { tenantId, productId } = session.metadata

            if (!tenantId || !productId) {
                console.error("Metadata ausente na sessão:", session.id)
                return new Response("Metadata ausente", { status: 400 })
            }

            // 1. Buscar a quantidade de créditos do produto
            const { data: product, error: productError } = await supabase
                .from("billing_products")
                .select("credits, title")
                .eq("stripe_product_id", productId)
                .single()

            if (productError || !product) {
                console.error("Produto não encontrado no banco:", productId)
                return new Response("Produto não encontrado", { status: 404 })
            }

            // 2. Adicionar créditos via RPC (Atomicamente)
            const { error: rpcError } = await supabase.rpc("add_tenant_credits", {
                p_tenant_id: tenantId,
                p_amount: product.credits,
                p_type: "purchase",
                p_description: `Compra: ${product.title} (Via Stripe)`
            })

            if (rpcError) {
                console.error("Erro ao adicionar créditos via RPC:", rpcError)
                return new Response("Erro ao atualizar saldo", { status: 500 })
            }

            console.log(`✅ Sucesso: ${product.credits} créditos adicionados ao tenant ${tenantId}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { "Content-Type": "application/json" },
            status: 200,
        })
    } catch (err) {
        console.error(`❌ Erro no Webhook: ${err.message}`)
        return new Response(`Erro: ${err.message}`, { status: 400 })
    }
})
