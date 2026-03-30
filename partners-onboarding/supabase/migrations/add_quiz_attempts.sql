-- Tabela de tentativas de quiz
CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage NUMERIC(5,2) NOT NULL,
  passed BOOLEAN NOT NULL,
  time_spent INTEGER,
  attempt_number INTEGER NOT NULL,
  cycle INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_quiz_attempts_user_module ON quiz_attempts(user_id, module_id);
CREATE INDEX idx_quiz_attempts_created ON quiz_attempts(user_id, module_id, created_at DESC);

-- RLS
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Usuário vê suas próprias tentativas
CREATE POLICY "Usuários veem suas tentativas"
  ON quiz_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Gestor vê tentativas da área dele (usa SECURITY DEFINER functions para evitar RLS circular)
CREATE POLICY "Gestor vê tentativas da área"
  ON quiz_attempts FOR SELECT
  USING (
    get_user_role() = 'gestor'
    AND get_user_area_id() = (
      SELECT area_id FROM users WHERE users.id = quiz_attempts.user_id
    )
  );

-- Admin vê tudo
CREATE POLICY "Admin vê todas as tentativas"
  ON quiz_attempts FOR SELECT
  USING (get_user_role() = 'admin');

-- Inserção: usuário autenticado insere suas próprias tentativas
CREATE POLICY "Usuário insere suas tentativas"
  ON quiz_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Adicionar novo tipo de notificação
ALTER TYPE notification_type ADD VALUE 'quiz_bloqueado';
