-- ========================================================
-- LEADFLOW PRO - MONETIZAÇÃO PARTE 2
-- Proteção de Cadências e Regras de Automação
-- ========================================================

-- 1. TRIGGER PARA ASSEQUÊNCIAS (CADÊNCIAS)
CREATE OR REPLACE FUNCTION enforce_sequence_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Validar se está tentando ativar ou criar uma sequência ativa
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        IF NOT check_tenant_limit(NEW.tenant_id, 'active_sequences') THEN
            RAISE EXCEPTION 'Limite de cadências ativas atingido para o seu plano.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sequence_limit_check ON outreach_sequences;
CREATE TRIGGER trg_sequence_limit_check
    BEFORE INSERT OR UPDATE ON outreach_sequences
    FOR EACH ROW EXECUTE FUNCTION enforce_sequence_limits();

-- 2. TRIGGER PARA REGRAS DE AUTOMAÇÃO
CREATE OR REPLACE FUNCTION enforce_rule_limits()
RETURNS TRIGGER AS $$
DECLARE
    v_plan TEXT;
    v_active_count INT;
BEGIN
    -- Só valida se a regra for ativada
    IF NEW.is_active = true AND (OLD.is_active IS NULL OR OLD.is_active = false) THEN
        SELECT plan INTO v_plan FROM tenants WHERE id = NEW.tenant_id;
        
        IF v_plan = 'free' THEN
            SELECT count(*) INTO v_active_count FROM automation_rules WHERE tenant_id = NEW.tenant_id AND is_active = true;
            IF v_active_count >= 3 THEN
                RAISE EXCEPTION 'Limite de 3 automações ativas atingido no Plano FREE.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rule_limit_check ON automation_rules;
CREATE TRIGGER trg_rule_limit_check
    BEFORE INSERT OR UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION enforce_rule_limits();
