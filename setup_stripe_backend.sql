-- =========================================================================
-- PARTE 1: TABELA DE GERENCIAMENTO DE PRODUTOS STRIPE
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.billing_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stripe_product_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_brl DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar leitura pública para todos listarem, edição só do Master
ALTER TABLE public.billing_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "produtos_leitura" ON public.billing_products;
CREATE POLICY "produtos_leitura" ON public.billing_products
    FOR SELECT USING (true);

-- Popula com os pacotes oficiais criados no seu front-end/Stripe
INSERT INTO public.billing_products (stripe_product_id, title, credits, price_brl)
VALUES
    ('prod_U3A45BMlFIPwuR', 'Starter Pack', 1000, 97.00),
    ('prod_U3A5Yx0OY2UO1O', 'Business', 5000, 297.00),
    ('prod_U3A6FOOsEgzPPg', 'Pro Elite', 20000, 797.00)
ON CONFLICT (stripe_product_id) DO UPDATE 
SET title = EXCLUDED.title, credits = EXCLUDED.credits, price_brl = EXCLUDED.price_brl;


-- =========================================================================
-- PARTE 2: RPC PARA O WEBHOOK ADICIONAR CRÉDITOS AUTOMATICAMENTE
-- =========================================================================
CREATE OR REPLACE FUNCTION public.add_tenant_credits(
    p_tenant_id UUID,
    p_amount INT,
    p_type TEXT,
    p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance BIGINT;
BEGIN
    SELECT credit_balance INTO v_current_balance FROM public.tenant_wallets
    WHERE tenant_id = p_tenant_id FOR UPDATE;

    IF v_current_balance IS NULL THEN
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance) VALUES (p_tenant_id, p_amount);
    ELSE
        UPDATE public.tenant_wallets SET credit_balance = credit_balance + p_amount, updated_at = NOW()
        WHERE tenant_id = p_tenant_id;
    END IF;

    -- Registrar no extrato
    INSERT INTO public.credit_transactions (tenant_id, amount, type, service_name, description)
    VALUES (p_tenant_id, p_amount, p_type, 'stripe_payment', p_description);

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.add_tenant_credits(UUID, INT, TEXT, TEXT) TO service_role; -- Apenas backend webhook

-- Atualiza cache
NOTIFY pgrst, 'reload schema';
