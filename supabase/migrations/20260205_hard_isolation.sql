
-- BLOQUEIO TOTAL DO TENANT DE DEMONSTRAÇÃO
-- Garante que ninguém (exceto Paulo) consiga ver os dados do tenant '0000...'
-- Isso impede que novos usuários "vazem" para a conta de teste

-- 1. Atualizar a Política de Leads para ser ainda mais restritiva
DROP POLICY IF EXISTS "Leads: isolamento absoluto" ON leads;
CREATE POLICY "Leads: isolamento absoluto" ON leads
    FOR ALL USING (
        (
            -- Só vê se o tenant_id do lead bater com o tenant_id do seu perfil
            tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
            AND 
            -- E não pode ser o tenant de demo (a menos que seja Master Admin)
            (tenant_id != '00000000-0000-0000-0000-000000000000' OR (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true)
        )
        OR
        -- Regra Master Admin (Paulo)
        (SELECT is_master_admin FROM profiles WHERE id = auth.uid()) = true
    );

-- 2. Garantir que novos perfis NÃO comecem vinculados ao tenant demo
-- Se houver um trigger, este comando servirá de alerta
ALTER TABLE profiles ALTER COLUMN tenant_id DROP DEFAULT;

-- 3. Limpar qualquer vínculo acidental
-- Se algum usuário (que não seja o Paulo) estiver preso no tenant demo, vamos desvincular
-- (Isso forçará o App a pedir um novo setup ou mostrar vazio)
UPDATE profiles 
SET tenant_id = NULL 
WHERE tenant_id = '00000000-0000-0000-0000-000000000000' 
AND is_master_admin = false;

-- Nota: Como tenant_id na tabela profiles é NOT NULL (de acordo com o schema), 
-- o update acima pode falhar. Se falhar, use o comando abaixo que cria um tenant "Limbo" para eles:
/*
INSERT INTO tenants (id, name, slug) VALUES ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Aguardando Setup', 'limbo') ON CONFLICT DO NOTHING;
UPDATE profiles SET tenant_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' WHERE tenant_id = '00000000-0000-0000-0000-000000000000' AND is_master_admin = false;
*/
