-- ============================================
-- Migration: trail_areas junction table
-- Permite que uma trilha pertença a múltiplas áreas
-- ============================================

-- 1. Criar tabela de junção trail_areas
CREATE TABLE IF NOT EXISTS trail_areas (
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  PRIMARY KEY (trail_id, area_id)
);

-- 2. Migrar dados existentes de trails.area_id para trail_areas
INSERT INTO trail_areas (trail_id, area_id)
SELECT id, area_id FROM trails WHERE area_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 3. Índices para performance
CREATE INDEX IF NOT EXISTS idx_trail_areas_trail_id ON trail_areas(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_areas_area_id ON trail_areas(area_id);

-- 4. Habilitar RLS
ALTER TABLE trail_areas ENABLE ROW LEVEL SECURITY;

-- 5. Policies para trail_areas
CREATE POLICY "trail_areas visíveis para usuários autenticados"
  ON trail_areas FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin ou gestor pode inserir trail_areas"
  ON trail_areas FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR (get_user_role() = 'gestor' AND area_id = get_user_area_id())
  );

CREATE POLICY "Admin ou gestor pode deletar trail_areas"
  ON trail_areas FOR DELETE
  USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'gestor' AND area_id = get_user_area_id())
  );

-- 6. Remover constraint antiga que exige area_id NOT NULL para tipos _area
ALTER TABLE trails DROP CONSTRAINT IF EXISTS trails_area_type_check;

-- 7. Atualizar RLS policies de trails para usar trail_areas
DROP POLICY IF EXISTS "Admin ou gestor pode criar trilhas" ON trails;
DROP POLICY IF EXISTS "Admin ou gestor pode atualizar trilhas" ON trails;
DROP POLICY IF EXISTS "Admin ou gestor pode deletar trilhas" ON trails;

-- INSERT: admin cria qualquer; gestor pode criar (a verificação de área é feita via trail_areas)
CREATE POLICY "Admin ou gestor pode criar trilhas"
  ON trails FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR get_user_role() = 'gestor'
  );

-- UPDATE: admin qualquer; gestor só se a trilha tem pelo menos uma área dele
CREATE POLICY "Admin ou gestor pode atualizar trilhas"
  ON trails FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (
      get_user_role() = 'gestor'
      AND EXISTS (
        SELECT 1 FROM trail_areas
        WHERE trail_areas.trail_id = trails.id
        AND trail_areas.area_id = get_user_area_id()
      )
    )
  );

-- DELETE: admin qualquer; gestor só se a trilha tem pelo menos uma área dele
CREATE POLICY "Admin ou gestor pode deletar trilhas"
  ON trails FOR DELETE
  USING (
    get_user_role() = 'admin'
    OR (
      get_user_role() = 'gestor'
      AND EXISTS (
        SELECT 1 FROM trail_areas
        WHERE trail_areas.trail_id = trails.id
        AND trail_areas.area_id = get_user_area_id()
      )
    )
  );

-- NOTA: A coluna trails.area_id é mantida por compatibilidade mas não será mais usada.
-- Ela pode ser removida em uma migration futura após confirmar que tudo funciona.
