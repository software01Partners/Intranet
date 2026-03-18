-- ETAPA 1: Adicionar novos valores ao enum
-- Rode esta etapa primeiro e aguarde o commit antes de rodar a etapa 2
ALTER TYPE trail_type ADD VALUE IF NOT EXISTS 'optativa_global';
ALTER TYPE trail_type ADD VALUE IF NOT EXISTS 'optativa_area';
