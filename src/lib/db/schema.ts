import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const songs = sqliteTable('songs', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  artist: text('artist'),
  language: text('language').default('id').notNull(),
  body: text('body').notNull(),
  metadata: text('metadata', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// Note: `songs_fts` virtual table + triggers live in migrations because Drizzle
// does not yet emit FTS definitions for D1. Keep column names aligned.
export type Song = typeof songs.$inferSelect;
