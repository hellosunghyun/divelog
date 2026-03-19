-- Migrate existing record types to new expanded types
-- personal → exploration
-- challenge → project
-- collaboration → project

UPDATE records SET type = 'exploration' WHERE type = 'personal';
UPDATE records SET type = 'project' WHERE type = 'challenge';
UPDATE records SET type = 'project' WHERE type = 'collaboration';
