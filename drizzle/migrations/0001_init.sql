-- Songs base table
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  artist TEXT,
  language TEXT NOT NULL DEFAULT 'id',
  body TEXT NOT NULL,
  metadata TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
  title,
  body,
  slug,
  content='songs',
  content_rowid='rowid'
);

-- Keep FTS in sync
CREATE TRIGGER IF NOT EXISTS songs_ai AFTER INSERT ON songs BEGIN
  INSERT INTO songs_fts(rowid, title, body, slug)
  VALUES (new.rowid, new.title, new.body, new.slug);
END;

CREATE TRIGGER IF NOT EXISTS songs_ad AFTER DELETE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, body, slug)
  VALUES('delete', old.rowid, old.title, old.body, old.slug);
END;

CREATE TRIGGER IF NOT EXISTS songs_au AFTER UPDATE ON songs BEGIN
  INSERT INTO songs_fts(songs_fts, rowid, title, body, slug)
  VALUES('delete', old.rowid, old.title, old.body, old.slug);
  INSERT INTO songs_fts(rowid, title, body, slug)
  VALUES (new.rowid, new.title, new.body, new.slug);
END;
