
-- ========================================================
-- LEADFLOW PRO - CREDIT RECHARGE FUNCTION
-- Utility function for secure credit addition (Webhooks)
-- ========================================================

CREATE OR REPLACE FUNCTION add_tenant_credits(
    p_tenant_id UUID,
    p_amount BIGINT,
    p_type TEXT,
    p_description TEXT
) RETURNS VOID AS $$
BEGIN
    -- 1. Upsert na wallet (Garante que existe e adiciona créditos)
    INSERT INTO tenant_wallets (tenant_id, credit_balance)
    VALUES (p_tenant_id, p_amount)
    ON CONFLICT (tenant_id) DO UPDATE
    SET credit_balance = tenant_wallets.credit_balance + p_amount,
        updated_at = NOW();

    -- 2. Registrar transação de entrada
    INSERT INTO credit_transactions (tenant_id, amount, type, description)
    VALUES (p_tenant_id, p_amount, p_type, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
