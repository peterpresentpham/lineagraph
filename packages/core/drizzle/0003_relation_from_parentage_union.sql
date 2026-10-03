-- Moves parent/child and marriage data from history.parentage / history.union into the
-- generic kg.relation table. The old tables are dropped by the next migration.

-- Types the copy below needs (labels are added by `pnpm db:seed`).
INSERT INTO kg.relation_type (code, category, inverse_code, is_symmetric, subject_kinds, object_kinds, is_primary, is_acyclic)
VALUES
  ('parent_of', 'family', 'child_of', false, ARRAY['person'], ARRAY['person'], true, true),
  ('child_of', 'family', 'parent_of', false, ARRAY['person'], ARRAY['person'], false, false),
  ('spouse_of', 'family', NULL, true, ARRAY['person'], ARRAY['person'], true, false)
ON CONFLICT (code) DO NOTHING;
--> statement-breakpoint

-- parentage(parent_id, child_id, kind) -> parent_of(from = parent, to = child).
-- kind 'disputed' becomes variant 'biological' + disputed = true.
INSERT INTO kg.relation (type, from_id, to_id, variant, disputed, state)
SELECT 'parent_of', parent_id, child_id,
       CASE WHEN kind = 'disputed' THEN 'biological' ELSE kind END,
       kind = 'disputed',
       'approved'
FROM history.parentage;
--> statement-breakpoint

-- union(a_id, b_id, kind, rank, ...) -> spouse_of, stored once with the smaller id first.
INSERT INTO kg.relation (type, from_id, to_id, variant, label, note, start_id, end_id, state)
SELECT 'spouse_of',
       CASE WHEN a_id < b_id THEN a_id ELSE b_id END,
       CASE WHEN a_id < b_id THEN b_id ELSE a_id END,
       kind, rank, end_reason, start_id, end_id, 'approved'
FROM history."union";
--> statement-breakpoint

-- One real-world fact is one row: same type, same pair, same variant cannot repeat.
CREATE UNIQUE INDEX relation_unique_key
  ON kg.relation (type, from_id, to_id, COALESCE(variant, ''));
