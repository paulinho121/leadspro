
-- ========================================================
-- LEADFLOW PRO - BILLING PRODUCTS CONFIGURATION
-- ========================================================

CREATE TABLE IF NOT EXISTS billing_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_product_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    credits BIGINT NOT NULL,
    price_brl DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Initial Products (Using the one provided by the user)
INSERT INTO billing_products (stripe_product_id, title, credits, price_brl, description)
VALUES 
('prod_U3A45BMlFIPwuR', 'Starter Pack', 1000, 97.00, 'Ideal para testar o Sherlock Mode em nichos específicos.'),
('prod_U3A5Yx0OY2UO1O', 'Business', 5000, 297.00, 'Perfeito para agências em fase de crescimento.'),
('prod_U3A6FOOsEgzPPg', 'Pro Elite', 20000, 797.00, 'Para operação massiva de extração estadual.')
ON CONFLICT (stripe_product_id) DO NOTHING;

-- RLS
ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing Products: visibility" ON billing_products
    FOR SELECT TO authenticated USING (is_active = true);
