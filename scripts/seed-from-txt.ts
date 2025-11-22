import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Song = {
  title: string;
  slug: string;
  artist?: string | null;
  language: 'id' | 'en';
  body: string;
};

const inputPath = process.env.LYRICS_FILE || 'lyrics_output (1).txt';
const dbName = process.env.D1_NAME || 'LYRICS_DB';
const wranglerEnv = process.env.CLOUDFLARE_ENV || 'local';

function main() {
  const songs = parseSongs(inputPath);
  if (songs.length === 0) {
    console.error(`No songs parsed from ${inputPath}`);
    process.exit(1);
  }

  // Write a reviewable JSON snapshot so we can diff/inspect before/after runs.
  writeFileSync('seed/parsed-songs.json', JSON.stringify(songs, null, 2));

  if (process.env.DRY_RUN === '1') {
    console.log(`Parsed ${songs.length} songs from ${inputPath}. DRY_RUN=1 so skipping DB seed.`);
    return;
  }

  seedToD1(songs);
  console.log(`Seeded ${songs.length} songs from ${inputPath} into ${dbName} (${wranglerEnv}).`);
}

function parseSongs(filePath: string): Song[] {
  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split(/\r?\n/);

  const results: Song[] = [];
  let currentTitle: string | null = null;
  let currentArtist: string | null = null;
  let bodyLines: string[] = [];
  const slugCounts: Record<string, number> = {};

  const flush = () => {
    if (!currentTitle) return;
    const body = bodyLines.join('\n').trim();
    if (!body) {
      currentTitle = null;
      currentArtist = null;
      bodyLines = [];
      return;
    }

    const baseSlug = slugify(currentTitle);
    const count = (slugCounts[baseSlug] || 0) + 1;
    slugCounts[baseSlug] = count;
    const slug = count === 1 ? baseSlug : `${baseSlug}-${count}`;

    results.push({
      title: currentTitle.trim(),
      slug,
      artist: currentArtist?.trim() || null,
      language: detectLanguage(body),
      body,
    });

    currentTitle = null;
    currentArtist = null;
    bodyLines = [];
  };

  for (const line of lines) {
    const maybeHeader = line.trim();
    const isHeader = maybeHeader.includes('|') && !maybeHeader.startsWith('Reff');

    if (isHeader) {
      // New song begins; flush the previous one first.
      flush();

      const [titlePart, artistPart] = maybeHeader.split('|').map((s) => s.trim());
      currentTitle = titlePart;
      currentArtist = artistPart || null;
      continue;
    }

    // Ignore leading empty lines before any title is set.
    if (!currentTitle && maybeHeader === '') continue;

    bodyLines.push(line);
  }

  flush();
  return results;
}

function detectLanguage(text: string): 'id' | 'en' {
  const lower = text.toLowerCase();
  const idTokens = ['yang', 'dan', 'kau', 'engkau', 'tuhan', 'allah', 'kasih', 'setia', 'kau', 'ku', 'mu', 'bapa', 'roh', 'kudus', 'sorga', 'bahkan', 'sebab', 'dalam', 'hatiku'];
  const enTokens = ['the', 'and', 'lord', 'jesus', 'love', 'grace', 'you', 'your', 'king', 'above', 'power'];

  const idScore = idTokens.reduce((acc, t) => (lower.includes(` ${t}`) ? acc + 1 : acc), 0);
  const enScore = enTokens.reduce((acc, t) => (lower.includes(` ${t}`) ? acc + 1 : acc), 0);

  if (idScore > enScore) return 'id';
  if (enScore > idScore) return 'en';
  // Fallback: default to Indonesian when lyrics contain "ku/ku/kan" patterns; otherwise English.
  if (/[k][au]u|ku |mu |kau /i.test(lower)) return 'id';
  return 'en';
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function seedToD1(songs: Song[]) {
  const values = songs
    .map(
      (song) =>
        `INSERT OR REPLACE INTO songs (id, slug, title, artist, language, body, metadata, created_at, updated_at)
VALUES (lower(hex(randomblob(16))), '${escapeSql(song.slug)}', '${escapeSql(song.title)}',
${song.artist ? `'${escapeSql(song.artist)}'` : 'NULL'},
'${escapeSql(song.language)}', '${escapeSql(song.body)}', NULL, unixepoch(), unixepoch());`,
    )
    .join('\n');

  const file = join(tmpdir(), `seed-from-txt-${Date.now()}.sql`);
  writeFileSync(file, `PRAGMA foreign_keys=off;\n${values}\n`);

  const args = ['d1', 'execute', dbName];
  if (wranglerEnv === 'local') args.push('--local');
  else args.push('--remote');
  args.push('--file', file);

  execFileSync('wrangler', args, { stdio: 'inherit' });
}

function escapeSql(str: string): string {
  return str.replace(/'/g, "''");
}

main();
