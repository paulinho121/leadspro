
export const STRIPE_CONFIG = {
    publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
};

export const PRICING_PLANS = [
    {
        id: 'starter',
        title: 'Starter Pack',
        credits: 1000,
        price: '97',
        description: 'Ideal para testar o Sherlock Mode em nichos específicos.',
        stripeProductId: 'prod_U3A45BMlFIPwuR',
        recommended: false
    },
    {
        id: 'business',
        title: 'Business',
        credits: 5000,
        price: '297',
        description: 'Perfeito para agências em fase de crescimento.',
        stripeProductId: 'prod_U3A5Yx0OY2UO1O',
        recommended: true
    },
    {
        id: 'pro-elite',
        title: 'Pro Elite',
        credits: 20000,
        price: '797',
        description: 'Para operação massiva de extração estadual.',
        stripeProductId: 'prod_U3A6FOOsEgzPPg',
        recommended: false
    }
];
