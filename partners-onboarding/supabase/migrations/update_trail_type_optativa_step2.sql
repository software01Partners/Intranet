-- ETAPA 2: Converter dados e atualizar constraint
-- Rode DEPOIS que a etapa 1 (ADD VALUE) já estiver commitada

-- 1. Remover o CHECK constraint antigo
ALTER TABLE trails DROP CONSTRAINT IF EXISTS trails_area_type_check;

-- 2. Converter trilhas optativas existentes para optativa_global
UPDATE trails
SET type = 'optativa_global'
WHERE type = 'optativa';

-- 3. Corrigir dados inconsistentes antes de recriar o constraint:
--    Tipos _global não devem ter area_id
UPDATE trails SET area_id = NULL
WHERE type IN ('obrigatoria_global', 'optativa_global') AND area_id IS NOT NULL;

--    Tipos _area devem ter area_id (se não tiver, não dá pra adivinhar — listar para verificar)
--    SELECT id, name, type FROM trails WHERE type IN ('obrigatoria_area', 'optativa_area') AND area_id IS NULL;

-- 4. Recriar constraint com os novos tipos
ALTER TABLE trails ADD CONSTRAINT trails_area_type_check CHECK (
  (type IN ('obrigatoria_global', 'optativa_global') AND area_id IS NULL)
  OR
  (type IN ('obrigatoria_area', 'optativa_area') AND area_id IS NOT NULL)
);
