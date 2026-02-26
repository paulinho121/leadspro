
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
            console.error('[Stripe] VITE_STRIPE_PUBLIC_KEY não encontrada.');
            throw new Error('Configuração do Stripe ausente (Public Key). Se você estiver em produção (Vercel), adicione VITE_STRIPE_PUBLIC_KEY nas Environment Variables do projeto.');
        }


        try {
            console.log('[Stripe] Invocando Edge Function para produto:', productId);

            const { data, error } = await supabase.functions.invoke('create-checkout-session', {
                body: { productId, tenantId }
            });

            if (error) {
                console.error('[Stripe] Erro retornado pela função:', error);

                // Tentar extrair mensagem do corpo se for um objeto de erro do Supabase
                let detailedMessage = error.message;

                // O Supabase às vezes retorna o erro no formato { error: "mensagem" } 
                // se a função retornar um JSON com status 400
                if (typeof error === 'object' && (error as any).context?.status === 400) {
                    console.log('[Stripe] Detectado erro 400, tentando extrair detalhes...');
                }

                throw new Error(detailedMessage || 'Erro ao criar sessão de pagamento.');
            }

            if (!data?.sessionId) {
                console.error('[Stripe] Sessão não retornada:', data);
                throw new Error('Falha técnica: Sessão de checkout não gerada.');
            }

            console.log('[Stripe] Sessão criada com sucesso:', data.sessionId);

            if (data?.url) {
                console.log('[Stripe] Redirecionando para a URL gerada...');
                window.location.href = data.url;
            } else {
                throw new Error('Falha no redirecionamento: O backend não retornou a URL de checkout (Atualize a página pressionando F5 e tente novamente).');
            }
        } catch (err: any) {
            console.error('[Stripe] Erro no fluxo de checkout:', err);
            throw err;
        }
    }
};
