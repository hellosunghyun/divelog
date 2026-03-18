-- Renumber existing record slugs from text to sequential integers (ordered by created_at)
UPDATE records
SET slug = CAST(
  (SELECT rn FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC) AS rn
    FROM records
  ) numbered WHERE numbered.id = records.id)
  AS TEXT
);
