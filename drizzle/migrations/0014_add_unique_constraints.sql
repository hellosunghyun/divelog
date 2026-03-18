DELETE FROM user_roles
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM user_roles
  GROUP BY user_id, role
);

DELETE FROM mentions
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM mentions
  GROUP BY record_id, mentioned_user_id
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_roles_user_role
  ON user_roles (user_id, role);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mentions_record_user
  ON mentions (record_id, mentioned_user_id);
