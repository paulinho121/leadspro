
-- ======================================================
-- MASTER CONSOLE: ESTATÍSTICAS REAIS E GLOBAIS (RPC)
-- ======================================================

CREATE OR REPLACE FUNCTION get_master_console_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  stats JSONB;
  v_is_master BOOLEAN;
BEGIN
  -- 1. Verificar se o usuário autenticado é um Master Admin
  SELECT COALESCE(is_master_admin, false) INTO v_is_master 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF NOT v_is_master THEN
    -- Fallback: Se não for master, retorna zeros ou erro
    -- Aqui levantamos erro para garantir que apenas o Master Admin veja os dados globais
    RAISE EXCEPTION 'Acesso negado. Apenas Master Admins podem acessar estas estatísticas globais.';
  END IF;

  -- 2. Coletar métricas reais sem limites de paginação do frontend
  -- Usamos regex para extrair cidade e estado de forma robusta da coluna 'location'
  SELECT jsonb_build_object(
    'totalLeads', (SELECT count(*) FROM public.leads),
    'enrichedLeads', (SELECT count(*) FROM public.leads WHERE status = 'ENRICHED'),
    'leadsLast30Days', (SELECT count(*) FROM public.leads WHERE created_at > now() - interval '30 days'),
    'citiesCount', (
      SELECT count(DISTINCT 
        trim(BOTH FROM (regexp_split_to_array(location, '[,|-]'))[1])
      )
      FROM public.leads
      WHERE location IS NOT NULL AND location != ''
    ),
    'statesCount', (
      SELECT count(DISTINCT 
        upper(trim(BOTH FROM 
          CASE 
            WHEN location ~ '[,|-]\s*[A-Za-z]{2}$' THEN (regexp_match(location, '([A-Za-z]{2})$'))[1]
            WHEN length(trim(location)) = 2 THEN location
            ELSE NULL
          END
        ))
      )
      FROM public.leads
      WHERE location IS NOT NULL AND location != ''
    ),
    'activeTenants', (SELECT count(*) FROM public.tenants WHERE is_active = true),
    'totalUsers', (SELECT count(*) FROM public.profiles),
    'openTickets', (SELECT count(*) FROM public.support_tickets WHERE status = 'open')
  ) INTO stats;

  -- 3. Inserir Valor de Mercado Estimado (Lógica de Negócio Centralizada)
  -- R$ 25 por enriquecido (Premium AI Data) | R$ 5 por lead base
  stats = stats || jsonb_build_object('marketValue', 
    ((stats->>'enrichedLeads')::numeric * 25) + 
    (((stats->>'totalLeads')::numeric - (stats->>'enrichedLeads')::numeric) * 5)
  );

  RETURN stats;
END;
$$;

-- Garantir permissão de execução para usuários autenticados
GRANT EXECUTE ON FUNCTION get_master_console_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_master_console_stats() TO service_role;
