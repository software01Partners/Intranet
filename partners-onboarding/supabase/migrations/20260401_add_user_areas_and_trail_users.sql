-- ============================================
-- Migration: Multi-area users + Individual trail assignment
-- ============================================

-- 1. Tabela user_areas (many-to-many: users <-> areas)
CREATE TABLE IF NOT EXISTS user_areas (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  area_id UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, area_id)
);

CREATE INDEX IF NOT EXISTS idx_user_areas_user_id ON user_areas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_areas_area_id ON user_areas(area_id);

-- Migrar dados existentes de users.area_id para user_areas
INSERT INTO user_areas (user_id, area_id)
SELECT id, area_id FROM users WHERE area_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- RLS para user_areas
ALTER TABLE user_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_areas_select" ON user_areas
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "user_areas_admin" ON user_areas
  FOR ALL USING (get_user_role() = 'admin');

-- 2. Tabela trail_users (atribuição individual de usuários a trilhas)
CREATE TABLE IF NOT EXISTS trail_users (
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (trail_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trail_users_trail_id ON trail_users(trail_id);
CREATE INDEX IF NOT EXISTS idx_trail_users_user_id ON trail_users(user_id);

-- RLS para trail_users
ALTER TABLE trail_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trail_users_select" ON trail_users
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "trail_users_admin" ON trail_users
  FOR ALL USING (get_user_role() = 'admin');

-- 3. Função auxiliar: retorna array de area_ids do usuário autenticado
CREATE OR REPLACE FUNCTION get_user_area_ids()
RETURNS UUID[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(area_id), '{}')
  FROM user_areas
  WHERE user_id = auth.uid();
$$;
