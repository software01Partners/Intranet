-- Remover policies antigas que só permitem admin
DROP POLICY IF EXISTS "Apenas admin pode criar trilhas" ON trails;
DROP POLICY IF EXISTS "Apenas admin pode atualizar trilhas" ON trails;
DROP POLICY IF EXISTS "Apenas admin pode deletar trilhas" ON trails;

-- INSERT: admin cria qualquer trilha; gestor só cria trilhas da própria área (obrigatoria_area)
CREATE POLICY "Admin ou gestor pode criar trilhas"
  ON trails FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'gestor'
        AND users.area_id = trails.area_id
    )
  );

-- UPDATE: admin atualiza qualquer trilha; gestor só atualiza trilhas da própria área
CREATE POLICY "Admin ou gestor pode atualizar trilhas"
  ON trails FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'gestor'
        AND users.area_id = trails.area_id
    )
  );

-- DELETE: admin deleta qualquer trilha; gestor só deleta trilhas da própria área
CREATE POLICY "Admin ou gestor pode deletar trilhas"
  ON trails FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'gestor'
        AND users.area_id = trails.area_id
    )
  );
