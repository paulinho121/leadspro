
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const stripePromise = loadStripe(STRIPE_PUBLIC_KEY || '');

export const StripeService = {
    /**
     * Inicia o processo de checkout criando uma sessão no backend
     * e redirecionando o usuário para o Stripe.
     */
    async createCheckoutSession(productId: string, tenantId: string) {
        if (!STRIPE_PUBLIC_KEY) {
            console.error('[Stripe] VITE_STRIPE_PUBLIC_KEY não configurada no .env.local');
            throw new Error('Configuração do Stripe ausente (Public Key). Verifique o arquivo .env.local e reinicie o servidor.');
        }

        try {
            console.log('[Stripe] Invocando Edge Function para produto:', productId);

            // Timeout de 15 segundos para a chamada da função
            const promise = supabase.functions.invoke('create-checkout-session', {
                body: { productId, tenantId }
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Tempo limite esgotado ao contatar o servidor de pagamentos.')), 15000)
            );

            const { data, error } = await Promise.race([promise, timeoutPromise]) as any;

            if (error) {
                console.error('[Stripe] Erro retornado pela função:', error);
                throw new Error(error.message || 'Erro ao criar sessão de pagamento.');
            }

            if (!data?.sessionId) {
                console.error('[Stripe] Sessão não retornada:', data);
                throw new Error('Falha técnica: Sessão de checkout não gerada.');
            }

            console.log('[Stripe] Sessão criada com sucesso:', data.sessionId);

            const stripe = await stripePromise;
            if (!stripe) throw new Error('Falha ao inicializar o SDK do Stripe.');

            console.log('[Stripe] Redirecionando para o Stripe Checkout...');
            const { error: redirectError } = await (stripe as any).redirectToCheckout({
                sessionId: data.sessionId
            });

            if (redirectError) {
                console.error('[Stripe] Erro no redirecionamento:', redirectError);
                throw redirectError;
            }
        } catch (err: any) {
            console.error('[Stripe] Erro no fluxo de checkout:', err);
            throw err;
        }
    }
};
