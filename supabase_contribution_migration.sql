-- ============================================================
-- Event Contribution Items — Lista de contribuições de evento
-- ============================================================
-- Cada evento pode ter uma lista opcional de itens (comidas/bebidas)
-- que os integrantes podem escolher trazer.
-- Rode este script no SQL Editor do Supabase.

CREATE TABLE IF NOT EXISTS event_contribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES group_events(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'outro', -- 'comida' | 'bebida' | 'outro'
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_by_name TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE event_contribution_items ENABLE ROW LEVEL SECURITY;

-- Todos os usuários autenticados podem visualizar
CREATE POLICY "Authenticated can view contribution items"
  ON event_contribution_items FOR SELECT
  TO authenticated
  USING (true);

-- Todos os usuários autenticados podem atualizar (para claim/unclaim)
CREATE POLICY "Authenticated can update contribution items"
  ON event_contribution_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Qualquer autenticado pode inserir (admin vai inserir via client)
CREATE POLICY "Authenticated can insert contribution items"
  ON event_contribution_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Qualquer autenticado pode deletar (admin vai deletar)
CREATE POLICY "Authenticated can delete contribution items"
  ON event_contribution_items FOR DELETE
  TO authenticated
  USING (true);
