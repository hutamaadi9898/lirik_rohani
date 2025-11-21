import { motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';

type SearchResult = {
  id: string;
  slug: string;
  title: string;
  artist?: string | null;
  language?: string | null;
  snippet?: string | null;
};

type Props = {
  initialQuery?: string;
};

const fade = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

export function SearchIsland({ initialQuery = '' }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasQuery = query.trim().length > 0;

  const fetchResults = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=20`);
        if (!res.ok) throw new Error('Gagal memuat hasil');
        const json = await res.json();
        setResults(json.results ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      } finally {
        setLoading(false);
      }
    },
    [setResults, setLoading],
  );

  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery);
    }
  }, [initialQuery, fetchResults]);

  const handleSubmit = useCallback(
    (evt: FormEvent) => {
      evt.preventDefault();
      fetchResults(query);
    },
    [fetchResults, query],
  );

  const placeholder = useMemo(
    () => 'Cari judul atau potongan lirik, contoh: kasih setiaMu',
    [],
  );

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-cyan-500/5">
        <label htmlFor="q" className="block text-sm font-medium text-slate-300">
          Cari lirik
        </label>
        <div className="mt-2 flex gap-3">
          <input
            id="q"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-base text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <button
            type="submit"
            className="rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5 hover:bg-cyan-400 focus:ring-2 focus:ring-cyan-500/60 focus:ring-offset-1 focus:ring-offset-slate-900"
          >
            Cari
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Kecepatan adalah prioritas. FTS5 di D1 + cache KV untuk query populer.
        </p>
      </form>

      {loading && (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-slate-800/60"
              aria-hidden
            />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {error}
        </div>
      )}

      {!loading && !error && hasQuery && results.length === 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          Tidak ada hasil untuk “{query}”.
        </div>
      )}

      <div className="space-y-4">
        {results.map((item) => (
          <motion.a
            key={item.id}
            href={`/song/${item.slug}`}
            className="block rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm shadow-cyan-500/5 hover:border-cyan-400/60"
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.2, delay: 0.02 }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-50">{item.title}</h3>
                {item.artist && (
                  <p className="text-sm text-slate-400">
                    {item.artist} · {item.language ?? 'id'}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                Lihat
              </span>
            </div>
            {item.snippet && (
              <p
                className="mt-3 text-sm text-slate-300"
                dangerouslySetInnerHTML={{ __html: item.snippet }}
              />
            )}
          </motion.a>
        ))}
      </div>
    </div>
  );
}

export default SearchIsland;
