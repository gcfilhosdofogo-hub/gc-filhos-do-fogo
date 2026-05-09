-- ============================================================
-- Event Target Audience — Público alvo do evento
-- ============================================================
-- Adiciona coluna target_audience à tabela group_events.
-- Valores: 'all' (padrão), 'brasil', 'argentina'
-- Rode este script no SQL Editor do Supabase.

ALTER TABLE group_events
  ADD COLUMN IF NOT EXISTS target_audience TEXT NOT NULL DEFAULT 'all';

-- Garante que só valores válidos sejam inseridos
ALTER TABLE group_events
  DROP CONSTRAINT IF EXISTS group_events_target_audience_check;

ALTER TABLE group_events
  ADD CONSTRAINT group_events_target_audience_check
  CHECK (target_audience IN ('all', 'brasil', 'argentina'));
