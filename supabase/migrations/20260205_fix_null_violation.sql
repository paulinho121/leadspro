
-- SOLUÇÃO PARA O ERRO DE CONSTRAINT (NOT-NULL)
-- Como a coluna tenant_id não aceita valor nulo, vamos criar um tenant de "Isolamento"
-- para mover qualquer usuário que esteja no lugar errado.

-- 1. Criar o Tenant de Limbo (Aguardando Configuração)
INSERT INTO tenants (id, name, slug) 
VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Aguardando Setup', 'limbo') 
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar os perfis que estavam no tenant demo para este novo tenant limpo
-- Isso remove eles da conta de teste sem quebrar a regra de "not null"
UPDATE profiles 
SET tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000' 
AND is_master_admin = false;

-- 3. Reforçar a política de RLS para que ninguém veja o Limbo nem o Demo
DROP POLICY IF EXISTS "Leads: isolamento absoluto" ON leads;
CREATE POLICY "Leads: isolamento absoluto" ON leads
    FOR ALL USING (
        (
            tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
            AND 
            tenant_id != '00000000-0000-0000-0000-000000000000' -- Bloqueia Demo
            AND
            tenant_id != 'ffffffff-ffff-ffff-ffff-ffffffffffff' -- Bloqueia Limbo
        )
        OR
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );
