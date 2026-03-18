-- ============================================
-- Partners Onboarding - Schema SQL Completo
-- ============================================

-- ============================================
-- 1. ENUMS
-- ============================================

-- Tipo de trilha
CREATE TYPE trail_type AS ENUM ('obrigatoria_global', 'obrigatoria_area', 'optativa_global', 'optativa_area');

-- Tipo de módulo
CREATE TYPE module_type AS ENUM ('video', 'document', 'quiz');

-- Role do usuário
CREATE TYPE user_role AS ENUM ('colaborador', 'gestor', 'admin');

-- Tipo de notificação
CREATE TYPE notification_type AS ENUM ('atraso', 'nova_trilha', 'certificado');

-- ============================================
-- 2. TABELAS
-- ============================================

-- Tabela de áreas
CREATE TABLE areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de usuários (referencia auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role user_role NOT NULL DEFAULT 'colaborador',
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de trilhas
CREATE TABLE trails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type trail_type NOT NULL,
  area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
  estimated_duration INTEGER, -- em minutos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de módulos
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type module_type NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  content_url TEXT,
  video_duration INTEGER, -- em segundos (apenas para vídeos)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de progresso do usuário
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  completed BOOLEAN NOT NULL DEFAULT false,
  progress_percentage INTEGER NOT NULL DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent INTEGER, -- em segundos
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

-- Tabela de questões de quiz
CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- array de objetos {text: string, is_correct: boolean}
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de certificados
CREATE TABLE certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES trails(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de notificações
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  related_trail_id UUID REFERENCES trails(id) ON DELETE SET NULL,
  related_certificate_id UUID REFERENCES certificates(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 3. FUNÇÕES AUXILIARES (SECURITY DEFINER)
-- ============================================

-- Retorna o role do usuário atual sem acionar RLS da tabela users
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Retorna a area_id do usuário atual sem acionar RLS da tabela users
CREATE OR REPLACE FUNCTION get_user_area_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT area_id FROM users WHERE id = auth.uid();
$$;

-- ============================================
-- 4. FUNÇÃO PARA ATUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trails_updated_at BEFORE UPDATE ON trails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quiz_questions_updated_at BEFORE UPDATE ON quiz_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================

-- Índices para user_progress
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_module_id ON user_progress(module_id);
CREATE INDEX idx_user_progress_completed ON user_progress(completed);

-- Índices para trails
CREATE INDEX idx_trails_area_id ON trails(area_id);
CREATE INDEX idx_trails_type ON trails(type);

-- Índices para modules
CREATE INDEX idx_modules_trail_id ON modules(trail_id);
CREATE INDEX idx_modules_type ON modules(type);
CREATE INDEX idx_modules_order ON modules(trail_id, "order");

-- Índices para quiz_questions
CREATE INDEX idx_quiz_questions_module_id ON quiz_questions(module_id);
CREATE INDEX idx_quiz_questions_order ON quiz_questions(module_id, "order");

-- Índices para certificates
CREATE INDEX idx_certificates_user_id ON certificates(user_id);
CREATE INDEX idx_certificates_trail_id ON certificates(trail_id);

-- Índices para notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(user_id, created_at DESC);

-- Índices para users
CREATE INDEX idx_users_area_id ON users(area_id);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. POLICIES - AREAS
-- ============================================

-- Leitura: todos autenticados podem ver
CREATE POLICY "Areas são visíveis para usuários autenticados"
  ON areas FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escrita: apenas admin
CREATE POLICY "Apenas admin pode criar áreas"
  ON areas FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar áreas"
  ON areas FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar áreas"
  ON areas FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 7. POLICIES - USERS
-- ============================================

-- Leitura: colaborador vê dados públicos; gestor/admin vê todos
CREATE POLICY "Usuários podem ver dados públicos de outros usuários"
  ON users FOR SELECT
  USING (
    auth.uid() = id OR -- próprio usuário
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.role IN ('gestor', 'admin')
    )
  );

-- Inserção: apenas sistema (via trigger ou service role)
CREATE POLICY "Usuários podem criar seu próprio registro"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Atualização: próprio usuário ou admin
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON users FOR UPDATE
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 8. POLICIES - TRAILS
-- ============================================

-- Leitura: todos autenticados
CREATE POLICY "Trilhas são visíveis para usuários autenticados"
  ON trails FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escrita: admin (qualquer trilha) ou gestor (somente trilhas da própria área)
CREATE POLICY "Admin ou gestor pode criar trilhas"
  ON trails FOR INSERT
  WITH CHECK (
    get_user_role() = 'admin'
    OR (get_user_role() = 'gestor' AND get_user_area_id() = area_id)
  );

CREATE POLICY "Admin ou gestor pode atualizar trilhas"
  ON trails FOR UPDATE
  USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'gestor' AND get_user_area_id() = area_id)
  );

CREATE POLICY "Admin ou gestor pode deletar trilhas"
  ON trails FOR DELETE
  USING (
    get_user_role() = 'admin'
    OR (get_user_role() = 'gestor' AND get_user_area_id() = area_id)
  );

-- ============================================
-- 9. POLICIES - MODULES
-- ============================================

-- Leitura: todos autenticados
CREATE POLICY "Módulos são visíveis para usuários autenticados"
  ON modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escrita: apenas admin
CREATE POLICY "Apenas admin pode criar módulos"
  ON modules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar módulos"
  ON modules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar módulos"
  ON modules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 10. POLICIES - USER_PROGRESS
-- ============================================

-- Leitura: colaborador vê só seu progresso; gestor/admin vê todos
CREATE POLICY "Usuários veem seu próprio progresso"
  ON user_progress FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role IN ('gestor', 'admin')
    )
  );

-- Inserção: próprio usuário ou admin
CREATE POLICY "Usuários podem criar seu próprio progresso"
  ON user_progress FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Atualização: próprio usuário ou admin
CREATE POLICY "Usuários podem atualizar seu próprio progresso"
  ON user_progress FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 11. POLICIES - QUIZ_QUESTIONS
-- ============================================

-- Leitura: todos autenticados
CREATE POLICY "Questões de quiz são visíveis para usuários autenticados"
  ON quiz_questions FOR SELECT
  USING (auth.role() = 'authenticated');

-- Escrita: apenas admin
CREATE POLICY "Apenas admin pode criar questões"
  ON quiz_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode atualizar questões"
  ON quiz_questions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

CREATE POLICY "Apenas admin pode deletar questões"
  ON quiz_questions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 12. POLICIES - CERTIFICATES
-- ============================================

-- Leitura: colaborador vê seus certificados; admin vê todos
CREATE POLICY "Usuários veem seus próprios certificados"
  ON certificates FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Inserção: apenas admin
CREATE POLICY "Apenas admin pode emitir certificados"
  ON certificates FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Atualização: apenas admin
CREATE POLICY "Apenas admin pode atualizar certificados"
  ON certificates FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 13. POLICIES - NOTIFICATIONS
-- ============================================

-- Leitura: cada usuário vê apenas suas notificações
CREATE POLICY "Usuários veem apenas suas notificações"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Inserção: sistema ou admin
CREATE POLICY "Sistema e admin podem criar notificações"
  ON notifications FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Atualização: próprio usuário ou admin
CREATE POLICY "Usuários podem atualizar suas notificações"
  ON notifications FOR UPDATE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- ============================================
-- 14. SEED DATA - ÁREAS
-- ============================================

INSERT INTO areas (id, name, description) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Tecnologia', 'Área responsável por desenvolvimento, infraestrutura e inovação tecnológica'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Recursos Humanos', 'Área responsável por gestão de pessoas, recrutamento e desenvolvimento organizacional'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Vendas e Marketing', 'Área responsável por vendas, marketing e relacionamento com clientes'),
  ('550e8400-e29b-41d4-a716-446655440003', 'Operações', 'Área responsável por processos operacionais e gestão de qualidade')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FIM DO SCHEMA
-- ============================================
