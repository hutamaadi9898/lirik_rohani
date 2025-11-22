import { useEffect, useState } from 'react';
import { Clock3, Music, Sparkles } from 'lucide-react';

type Latest = { slug: string; title: string; artist: string | null; updated_at: number | null };

type Stats = {
  total: number;
  latest: Latest[];
};

export default function StatsIsland() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Avoid 304/conditional responses from CDN that would leave us with no body.
        const res = await fetch('/api/stats', { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (res.status === 304) {
          // Treat as a soft miss; try again without conditional caching.
          const retry = await fetch('/api/stats', { cache: 'reload', headers: { 'Cache-Control': 'no-cache' } });
          if (!retry.ok) throw new Error('Gagal memuat data');
          const json = (await retry.json()) as Stats;
          if (!cancelled) setStats(json);
          return;
        }
        if (!res.ok) throw new Error('Gagal memuat data');
        const json = (await res.json()) as Stats;
        if (!cancelled) setStats(json);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-white/5 bg-slate-950/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total lagu</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {stats ? stats.total.toLocaleString('id-ID') : '…'}
            </p>
            <p className="text-xs text-slate-400">Terkurasi untuk ibadah & pribadi</p>
          </div>
          <span className="rounded-full bg-cyan-400/15 p-3 text-cyan-100">
            <Music className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-950/80 p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Terbaru</p>
          <Sparkles className="h-4 w-4 text-cyan-200" />
        </div>
        <div className="mt-3 space-y-2">
          {error && <p className="text-sm text-rose-200">{error}</p>}
          {!stats && !error && <p className="text-sm text-slate-400">Memuat…</p>}
          {stats?.latest?.map((song) => (
            <a
              key={song.slug}
              href={`/song/${song.slug}`}
              className="group flex items-center justify-between rounded-lg px-2 py-1 text-sm text-white transition hover:text-cyan-200"
            >
              <span className="truncate">{song.title}</span>
              <span className="flex items-center gap-1 text-xs text-slate-400 group-hover:text-cyan-200">
                <Clock3 className="h-3.5 w-3.5" />
                {song.updated_at ? new Date(song.updated_at * 1000).toLocaleDateString('id-ID') : 'Baru'}
              </span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
