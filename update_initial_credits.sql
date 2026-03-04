CREATE OR REPLACE FUNCTION public.claim_initial_credits()
RETURNS JSONB AS $$
DECLARE
    v_ip TEXT;
    v_tenant_id UUID;
    v_wallet_record RECORD;
BEGIN
    SELECT tenant_id INTO v_tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
    IF v_tenant_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão inválida.');
    END IF;

    BEGIN
        v_ip := split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1);
    EXCEPTION WHEN OTHERS THEN
        v_ip := 'unknown';
    END;
    IF v_ip IS NULL OR v_ip = '' THEN v_ip := 'unknown'; END IF;

    IF v_ip != 'unknown' THEN
        IF EXISTS (SELECT 1 FROM public.claimed_ips WHERE ip_address = v_ip) THEN
            RETURN jsonb_build_object('success', false, 'message', 'Créditos já resgatados por este IP.');
        END IF;
    END IF;

    SELECT * INTO v_wallet_record FROM public.tenant_wallets WHERE tenant_id = v_tenant_id FOR UPDATE;
    IF v_wallet_record IS NULL THEN
        INSERT INTO public.tenant_wallets (tenant_id, credit_balance, initial_credits_claimed)
        VALUES (v_tenant_id, 0, false) RETURNING * INTO v_wallet_record;
    END IF;

    IF v_wallet_record.initial_credits_claimed = true THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sua organização já resgatou os créditos iniciais.');
    END IF;

    UPDATE public.tenant_wallets
    SET credit_balance = credit_balance + 500, initial_credits_claimed = true, updated_at = NOW()
    WHERE tenant_id = v_tenant_id;

    IF v_ip != 'unknown' THEN
        INSERT INTO public.claimed_ips (ip_address, tenant_id) VALUES (v_ip, v_tenant_id) ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO public.credit_transactions (tenant_id, amount, type, description)
    VALUES (v_tenant_id, 500, 'bonus', 'Bônus inicial de 500 créditos');

    RETURN jsonb_build_object('success', true, 'message', '500 créditos liberados!');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
