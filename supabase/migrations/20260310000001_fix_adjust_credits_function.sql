
-- ========================================================
-- FIX: ADJUST_TENANT_CREDITS FUNCTION
-- Ensures correct signature and permissions for Master Console
-- ========================================================

-- Drop the old version if it exists with INT type to avoid confusion
-- Note: Postgres allows multiple functions with same name but different signatures
DROP FUNCTION IF EXISTS public.adjust_tenant_credits(UUID, INT, TEXT);

CREATE OR REPLACE FUNCTION public.adjust_tenant_credits(
    p_tenant_id UUID,
    p_amount BIGINT,
    p_description TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_is_master BOOLEAN;
    v_new_balance BIGINT;
BEGIN
    -- 1. Verificar se quem está chamando é o Master Admin
    SELECT is_master_admin INTO v_is_master 
    FROM public.profiles 
    WHERE id = auth.uid();

    IF v_is_master IS NOT TRUE THEN
        RAISE EXCEPTION 'Acesso negado: Apenas Master Admins podem ajustar créditos manualmente.';
    END IF;

    -- 2. Atualizar ou Criar Carteira
    -- Garantimos que credit_balance seja BIGINT na tabela se necessário, 
    -- mas aqui apenas fazemos o upsert
    INSERT INTO public.tenant_wallets (tenant_id, credit_balance, updated_at)
    VALUES (p_tenant_id, p_amount, NOW())
    ON CONFLICT (tenant_id) 
    DO UPDATE SET 
        credit_balance = public.tenant_wallets.credit_balance + EXCLUDED.credit_balance,
        updated_at = NOW()
    RETURNING credit_balance INTO v_new_balance;

    -- 3. Registrar Transação
    INSERT INTO public.credit_transactions (
        tenant_id, 
        amount, 
        type, 
        description
    ) VALUES (
        p_tenant_id,
        p_amount,
        CASE WHEN p_amount > 0 THEN 'bonus' ELSE 'usage' END,
        p_description
    );

    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', v_new_balance
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Garantir permissões explicitamente
GRANT EXECUTE ON FUNCTION public.adjust_tenant_credits(UUID, BIGINT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_tenant_credits(UUID, BIGINT, TEXT) TO service_role;

-- Comentário para auditoria
COMMENT ON FUNCTION public.adjust_tenant_credits IS 'Permite que Master Admins ajustem o saldo de créditos de qualquer tenant. Corrigido para suportar BIGINT.';
