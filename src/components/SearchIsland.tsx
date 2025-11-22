import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Loader2, Search } from 'lucide-react';
import { Component, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

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

const highlight = (text: string, query: string) => {
  if (!query.trim()) return text;
  const tokens = Array.from(new Set(query.split(/\s+/).filter(Boolean))).slice(0, 6);
  if (!tokens.length) return text;
  const pattern = new RegExp(`(${tokens.map((t) => escapeRegExp(t)).join('|')})`, 'gi');
  return text.replace(pattern, '<mark class="bg-cyan-300/40 text-white px-0.5 rounded">$1</mark>');
};

const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const baseFade = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0 },
};

function SearchContent({ initialQuery = '' }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const [query, setQuery] = useState(initialQuery);
  const [lang, setLang] = useState<'all' | 'id' | 'en'>('all');
  const [titleOnly, setTitleOnly] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const controllerRef = useRef<AbortController | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>(["kasih setiaMu", "bapa engkau baik", "allah itu baik", "above all", "ku rindu" ]);
  const [lastQuery, setLastQuery] = useState('');

  const hasQuery = query.trim().length > 0;
  const debounceMs = 250;
  const [lastFetched, setLastFetched] = useState('');

  const persistRecent = useCallback((term: string) => {
    try {
      const trimmed = term.trim();
      if (!trimmed) return;
      const key = 'lr_recent_queries';
      const existing = JSON.parse(localStorage.getItem(key) || '[]') as string[];
      const next = [trimmed, ...existing.filter((t) => t !== trimmed)].slice(0, 6);
      localStorage.setItem(key, JSON.stringify(next));
      setSuggestions((prev) => Array.from(new Set([...next, ...prev])).slice(0, 8));
    } catch (err) {
      console.error('Persist recent failed', err);
    }
  }, []);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('lr_recent_queries') || '[]') as string[];
      if (Array.isArray(stored) && stored.length) {
        setSuggestions((prev) => Array.from(new Set([...stored, ...prev])).slice(0, 8));
      }
    } catch {
      /* ignore */
    }
  }, []);

  const fetchResults = useCallback(
    async (q: string, opts?: { lang?: 'all' | 'id' | 'en'; titleOnly?: boolean }) => {
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

      setLastFetched(trimmed + JSON.stringify(opts ?? {}));
      setLoading(true);
      setError(null);
      setStatus('Mencari…');

      try {
        const params = new URLSearchParams({ q: trimmed, limit: '20' });
        if (opts?.lang && opts.lang !== 'all') params.set('lang', opts.lang);
        if (opts?.titleOnly) params.set('titleOnly', '1');
        const res = await fetch(`/api/search?${params.toString()}`, {
          signal: nextController.signal,
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) throw new Error('Gagal memuat hasil');
        const json = (await res.json()) as { results?: SearchResult[] };
        setResults(json.results ?? []);
        setLastQuery(trimmed);
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
      fetchResults(initialQuery, { lang, titleOnly });
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
      if (query + JSON.stringify({ lang, titleOnly }) !== lastFetched) fetchResults(query, { lang, titleOnly });
    }, debounceMs);
    return () => clearTimeout(handle);
  }, [query, fetchResults, lastFetched, lang, titleOnly]);

  const handleSubmit = useCallback(
    (evt: FormEvent) => {
      evt.preventDefault();
      fetchResults(query, { lang, titleOnly });
      persistRecent(query);
    },
    [fetchResults, query, lang, titleOnly, persistRecent],
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

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
            <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Bahasa</span>
              {(
                [
                  { key: 'all', label: 'Semua' },
                  { key: 'id', label: 'Indonesia' },
                  { key: 'en', label: 'Inggris' },
                ] as const
              ).map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setLang(item.key)}
                  className={`min-h-[44px] rounded-full px-3 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${lang === item.key ? 'bg-cyan-400 text-slate-950' : 'text-slate-200 hover:text-white'}`}
                  aria-pressed={lang === item.key}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTitleOnly((v) => !v)}
              className={`min-h-[44px] rounded-full border px-3 py-2 text-xs transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 ${titleOnly ? 'border-cyan-400 bg-cyan-400/10 text-cyan-100' : 'border-white/10 text-slate-200 hover:text-white'}`}
              aria-pressed={titleOnly}
            >
              Judul saja
            </button>
          </div>

          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    fetchResults(s, { lang, titleOnly });
                    persistRecent(s);
                  }}
                  className="min-h-[44px] rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-300 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

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
            rel="prefetch"
            className="block rounded-2xl border border-white/5 bg-slate-950/70 p-4 shadow-sm transition hover:-translate-y-1 hover:border-cyan-400/60"
            variants={prefersReducedMotion ? undefined : baseFade}
            initial="initial"
            animate="animate"
            transition={{ duration: 0.14, delay: idx * 0.02 }}
          >
            <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white leading-snug" dangerouslySetInnerHTML={{ __html: highlight(item.title, lastQuery) }} />
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

class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.error('SearchIsland error', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          Gagal memuat pencarian. Muat ulang halaman dan coba lagi.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function SearchIsland(props: Props) {
  return (
    <ErrorBoundary>
      <SearchContent {...props} />
    </ErrorBoundary>
  );
}
