-- Adicionar coluna de prazo às trilhas (nullable = sem prazo)
-- Usar DATE (sem hora) para evitar problemas de fuso horário
ALTER TABLE trails ADD COLUMN deadline DATE DEFAULT NULL;

-- Comentário para documentação
COMMENT ON COLUMN trails.deadline IS 'Prazo para conclusão da trilha (YYYY-MM-DD). NULL = sem prazo.';
