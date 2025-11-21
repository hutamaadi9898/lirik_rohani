import { motion } from 'framer-motion';
import { ArrowRight, Loader2, Search } from 'lucide-react';
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
  initial: { opacity: 0, y: 4 },
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
      <div className="rounded-2xl border border-white/5 bg-slate-950/80 p-5 shadow-xl sm:p-6" role="search">
        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Cari lirik rohani">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">Pencarian cepat</p>
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Cari lirik lagu rohani</h2>
            <p className="text-sm text-slate-300">Ketik beberapa kata. Kami tampilkan hasil segera.</p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/5 bg-white/5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              id="q"
              name="q"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full rounded-xl bg-transparent px-12 py-4 text-base text-slate-50 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-cyan-200" aria-hidden />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-2">Hasil diperbarui otomatis</span>
            <span className="flex items-center gap-2">Tekan Enter jika ingin</span>
          </div>

          <motion.button
            type="submit"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.99 }}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-400/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            Cari
            <ArrowRight className="h-4 w-4" />
          </motion.button>
          <div className="sr-only" aria-live="polite">{loading ? 'Mencari…' : status}</div>
        </form>
      </div>

      {loading && (
        <div className="grid gap-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-slate-900/70" aria-hidden />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {error}
        </div>
      )}

      {!loading && !error && hasQuery && results.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
          Tidak ada hasil untuk “{query}”. Coba kata yang lebih spesifik.
        </div>
      )}

      <div className="space-y-3">
        {results.map((item, idx) => (
          <motion.a
            key={item.id}
            href={`/song/${item.slug}`}
            className="block rounded-2xl border border-white/5 bg-slate-950/70 p-4 shadow-sm transition hover:-translate-y-1 hover:border-cyan-400/60"
            variants={fade}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.14, delay: idx * 0.02 }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white leading-snug">{item.title}</h3>
                {item.artist && <p className="text-sm text-slate-400">{item.artist}</p>}
              </div>
              <ArrowRight className="h-4 w-4 text-cyan-200" />
            </div>
            {typeof item.snippet === 'string' && item.snippet.trim().length > 0 && (
              <p
                className="mt-2 line-clamp-2 text-sm text-slate-200"
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
