-- Migration: Adicionar time_spent na tabela user_progress
ALTER TABLE user_progress ADD COLUMN IF NOT EXISTS time_spent INTEGER DEFAULT NULL;
