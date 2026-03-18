-- Tabela de logs de auditoria para ações de admins e gestores
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL CHECK (user_role IN ('admin', 'gestor')),
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  entity_type TEXT NOT NULL, -- 'trail', 'module', 'area', 'user', 'quiz_question'
  entity_id UUID, -- ID do recurso afetado (pode ser null se deletado)
  entity_name TEXT, -- Nome do recurso para exibição
  details JSONB DEFAULT '{}', -- Detalhes extras da ação
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas eficientes
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);

-- RLS: apenas admin pode ler os logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admin pode visualizar logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- Inserção permitida para admin e gestor (via service role na prática)
CREATE POLICY "Service role pode inserir logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);
