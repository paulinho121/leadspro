
-- CORREÇÃO CRÍTICA DE PRIVACIDADE E SEGURANÇA
-- Impede que usuários normais vejam leads do tenant default (0000...)
-- Mantém acesso total apenas para Paulo ou Master Admins

-- 1. Remover polígrafo permissivo antigo
DROP POLICY IF EXISTS "Leads: isolamento e dev mix" ON leads;

-- 2. Criar nova política ultra-estrita
CREATE POLICY "Leads: isolamento absoluto" ON leads
    FOR ALL USING (
        -- Regra 1: O lead pertence ao tenant do usuário logado
        tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        OR
        -- Regra 2: O usuário logado é o Paulo (Master Admin Central)
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 3. Caso o tenant_id do usuário esteja nulo por algum motivo (erro de cadastro), 
-- ele não deve ver nada por padrão, em vez de ver o tenant 0000.
