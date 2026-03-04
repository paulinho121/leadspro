-- =========================================================================
-- PARTE 1: CORREÇÃO DA TABELA DE TRANSAÇÕES FINANCEIRAS (Extrato Inteligente Vazio)
-- =========================================================================

-- Certifique-se de que a segurança está ligada
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Apaga políticas antigas para evitar colisão
DROP POLICY IF EXISTS "transactions_leitura" ON public.credit_transactions;
DROP POLICY IF EXISTS "Transactions: isolation" ON public.credit_transactions;
DROP POLICY IF EXISTS "Transactions: Isolamento Tenant" ON public.credit_transactions;

-- Cria uma política de leitura robusta para que o usuário ou master consigam ver as transações (Extrato)
CREATE POLICY "transactions_leitura" ON public.credit_transactions
    FOR SELECT TO authenticated
    USING (
        tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
        OR (SELECT is_master_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1) = true
    );

-- Atualiza cache para refletir as mudanças do extrato imediatamente
NOTIFY pgrst, 'reload schema';
