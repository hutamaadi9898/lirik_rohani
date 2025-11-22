import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type SeedSong = {
  title: string;
  slug: string;
  artist?: string;
  language?: string;
  body: string;
};

const dbName = process.env.D1_NAME || 'LYRICS_DB';
const wranglerEnv = process.env.CLOUDFLARE_ENV || 'local';

function main() {
  const raw = readFileSync('seed/songs.json', 'utf-8');
  const data = JSON.parse(raw) as SeedSong[];
  const values = data
    .map(
      (song) =>
        `INSERT OR REPLACE INTO songs (id, slug, title, artist, language, body, metadata, created_at, updated_at)
         VALUES (lower(hex(randomblob(16))), '${escape(song.slug)}', '${escape(song.title)}',
         ${song.artist ? `'${escape(song.artist)}'` : 'NULL'},
         '${escape(song.language || 'id')}', '${escape(song.body)}', NULL, unixepoch(), unixepoch());`,
    )
    .join('\n');

  const file = join(tmpdir(), `seed-${Date.now()}.sql`);
  writeFileSync(
    file,
    `
PRAGMA foreign_keys=off;
${values}
`,
  );

  const args = ['d1', 'execute', dbName];
  if (wranglerEnv === 'local') args.push('--local');
  args.push('--file', file);

  execFileSync('wrangler', args, { stdio: 'inherit' });
  console.log(`Seeded ${data.length} songs into ${dbName} using ${wranglerEnv} environment.`);
}

function escape(str: string) {
  return str.replace(/'/g, "''");
}

main();
