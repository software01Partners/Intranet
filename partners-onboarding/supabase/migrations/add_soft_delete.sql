-- ============================================
-- Migration: Soft Delete (Lixeira)
-- Adiciona deleted_at em trails, modules, areas
-- ============================================

-- 1. Adicionar coluna deleted_at
ALTER TABLE trails ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE modules ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE areas ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Índices parciais para performance (queries normais filtram deleted_at IS NULL)
CREATE INDEX idx_trails_not_deleted ON trails(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_modules_not_deleted ON modules(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_areas_not_deleted ON areas(id) WHERE deleted_at IS NULL;

-- Índice para o cron de purge (busca por deleted_at antigos)
CREATE INDEX idx_trails_deleted_at ON trails(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_modules_deleted_at ON modules(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX idx_areas_deleted_at ON areas(deleted_at) WHERE deleted_at IS NOT NULL;

-- 3. Atualizar RLS policies de SELECT para filtrar itens deletados
-- Todos os usuários (incluindo admin) só veem itens NÃO deletados via client.
-- A API da lixeira usa o admin client (service role) que bypassa RLS,
-- então consegue ver os itens deletados sem precisar de policy especial.

-- TRAILS: substituir policy de SELECT
DROP POLICY IF EXISTS "Trilhas são visíveis para usuários autenticados" ON trails;

CREATE POLICY "Trilhas ativas são visíveis para usuários autenticados"
  ON trails FOR SELECT
  USING (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  );

-- MODULES: substituir policy de SELECT
DROP POLICY IF EXISTS "Módulos são visíveis para usuários autenticados" ON modules;

CREATE POLICY "Módulos ativos são visíveis para usuários autenticados"
  ON modules FOR SELECT
  USING (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  );

-- AREAS: substituir policy de SELECT
DROP POLICY IF EXISTS "Areas são visíveis para usuários autenticados" ON areas;

CREATE POLICY "Áreas ativas são visíveis para usuários autenticados"
  ON areas FOR SELECT
  USING (
    auth.role() = 'authenticated' AND deleted_at IS NULL
  );

-- 4. Função para purge automático (usada pelo cron)
CREATE OR REPLACE FUNCTION purge_deleted_items()
RETURNS TABLE(purged_trails INT, purged_modules INT, purged_areas INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trails INT;
  v_modules INT;
  v_areas INT;
BEGIN
  -- Deletar módulos órfãos (sem trilha associada ou módulos com deleted_at > 30 dias)
  WITH deleted AS (
    DELETE FROM modules
    WHERE deleted_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO v_modules FROM deleted;

  -- Deletar trilhas com deleted_at > 30 dias (CASCADE remove módulos restantes)
  WITH deleted AS (
    DELETE FROM trails
    WHERE deleted_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO v_trails FROM deleted;

  -- Deletar áreas com deleted_at > 30 dias
  WITH deleted AS (
    DELETE FROM areas
    WHERE deleted_at < now() - interval '30 days'
    RETURNING id
  )
  SELECT count(*) INTO v_areas FROM deleted;

  RETURN QUERY SELECT v_trails, v_modules, v_areas;
END;
$$;
