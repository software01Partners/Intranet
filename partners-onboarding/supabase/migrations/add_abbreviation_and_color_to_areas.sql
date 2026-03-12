-- Adiciona campos abbreviation e color à tabela areas
ALTER TABLE areas
ADD COLUMN IF NOT EXISTS abbreviation VARCHAR(10),
ADD COLUMN IF NOT EXISTS color VARCHAR(7);

-- Comentários para documentação
COMMENT ON COLUMN areas.abbreviation IS 'Abreviação da área (ex: COM, OP, RH, TI)';
COMMENT ON COLUMN areas.color IS 'Cor hexadecimal da área (ex: #3B82F6)';
