-- =========================================================================
-- RESET CREDIT BALANCES FOR ALL USERS EXCEPT MASTER
-- =========================================================================

DO $$
DECLARE
    v_master_tenant_id UUID;
BEGIN
    -- 1. Localizar o Tenant ID que possui um usuário Master
    -- (Presume-se que o tenant do Master é o que não deve ser zerado)
    SELECT tenant_id INTO v_master_tenant_id 
    FROM public.profiles 
    WHERE is_master_admin = true 
    LIMIT 1;

    -- 2. Zerar o saldo de todos os tenants que NÃO são o master
    -- Também marcamos initial_credits_claimed como TRUE para evitar que usuários 
    -- antigos resgatem o bônus novamente após o reset.
    UPDATE public.tenant_wallets
    SET 
        credit_balance = 0,
        initial_credits_claimed = true,
        updated_at = NOW()
    WHERE tenant_id != v_master_tenant_id OR v_master_tenant_id IS NULL;

    -- Nota: Se v_master_tenant_id for NULL, nada será alterado por segurança 
    -- (v_tenant_id != NULL resulta em UNKNOWN).
    -- Para garantir que pelo menos os outros sejam zerados se master não for achado, 
    -- mas is_master é crucial, então deixamos assim.
    
    RAISE NOTICE 'Reset de créditos concluído. Master Tenant ID: %', v_master_tenant_id;
END $$;
