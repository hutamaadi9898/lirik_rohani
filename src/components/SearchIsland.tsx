import { motion } from 'framer-motion';
import { ArrowUpRight, Loader2, Music2, Search, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

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
  const [status, setStatus] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const hasQuery = query.trim().length > 0;
  const debounceMs = 250;
  const [lastFetched, setLastFetched] = useState('');

  const fetchResults = useCallback(
    async (q: string) => {
      const trimmed = q.trim();
      if (!trimmed) {
        setResults([]);
        setStatus('');
        setLoading(false);
        return;
      }

      controllerRef.current?.abort();
      const nextController = new AbortController();
      controllerRef.current = nextController;

      setLastFetched(trimmed);
      setLoading(true);
      setError(null);
      setStatus('Mencari…');

      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=20`, {
          signal: nextController.signal,
        });
        if (!res.ok) throw new Error('Gagal memuat hasil');
        const json = await res.json();
        setResults(json.results ?? []);
        setStatus(json.results?.length ? `Menemukan ${json.results.length} hasil` : 'Tidak ada hasil');
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        setStatus('');
      } finally {
        if (!nextController.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [setResults, setLoading],
  );

  useEffect(() => {
    if (initialQuery) {
      fetchResults(initialQuery);
    }

    return () => {
      controllerRef.current?.abort();
    };
  }, [initialQuery, fetchResults]);

  // Live search as user types (debounced).
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      if (query !== lastFetched) fetchResults(query);
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [query, fetchResults, lastFetched]);

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
      <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900/80 via-slate-950/70 to-slate-950/90 p-6 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl sm:p-8" role="search">
        <div className="pointer-events-none absolute -left-10 top-10 h-44 w-44 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="pointer-events-none absolute right-0 bottom-0 h-52 w-52 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 rounded-[28px] border border-white/5" />

        <div className="relative flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200/80">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[11px] font-semibold text-cyan-100">
            <Sparkles className="h-4 w-4" /> Mode cepat
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-[11px] font-semibold text-slate-200">
            <Music2 className="h-4 w-4 text-cyan-200" /> Lirik rohani Indonesia
          </span>
        </div>

        <form onSubmit={handleSubmit} className="relative mt-5 space-y-4" aria-label="Cari lirik rohani">
          <div className="flex flex-col gap-3 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-300" aria-hidden="true" />
              Hasil ter-update otomatis saat mengetik
            </span>
            <span className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-xs font-medium text-slate-200">
              <Sparkles className="h-4 w-4" /> Edge cache + FTS5
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-3 shadow-lg shadow-cyan-500/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  id="q"
                  name="q"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-12 py-4 text-base text-slate-50 shadow-inner shadow-black/30 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
                {loading && (
                  <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-cyan-200" aria-hidden />
                )}
              </div>
              <motion.button
                type="submit"
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-500 px-5 py-4 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                {loading ? 'Mencari…' : 'Cari sekarang'}
                <ArrowUpRight className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
          <p className="text-sm text-slate-400">FTS5 di D1 + cache KV untuk query populer. Tidak perlu tekan enter, hasil segera muncul.</p>
          <div className="sr-only" aria-live="polite">{loading ? 'Mencari…' : status}</div>
        </form>
      </div>

      {loading && (
        <div className="grid gap-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="relative h-20 overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80"
              aria-hidden
            >
              <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {error}
        </div>
      )}

      {!loading && !error && hasQuery && results.length === 0 && (
        <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
          Tidak ada hasil untuk “{query}”. Coba kata kunci lain atau nama artis.
        </div>
      )}

      <div className="space-y-4">
        {results.map((item, idx) => (
          <motion.a
            key={item.id}
            href={`/song/${item.slug}`}
            className="group relative block overflow-hidden rounded-2xl border border-white/5 bg-slate-950/70 p-5 shadow-lg shadow-cyan-500/5 transition hover:-translate-y-1 hover:border-cyan-400/60"
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.18, delay: idx * 0.02 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.language ?? 'id'}</p>
                <h3 className="text-xl font-semibold text-white leading-snug">{item.title}</h3>
                {item.artist && <p className="text-sm text-slate-400">{item.artist}</p>}
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-400/15 px-3 py-1 text-xs font-semibold text-cyan-100 transition group-hover:translate-x-1">
                Lihat
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
            {typeof item.snippet === 'string' && item.snippet.trim().length > 0 && (
              <p
                className="mt-3 line-clamp-2 text-sm text-slate-200"
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
