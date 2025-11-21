import { useState, FormEvent } from 'react';

type Song = {
  id?: string;
  slug: string;
  title: string;
  artist?: string | null;
  language?: string | null;
  body: string;
};

type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: string };

export default function AdminIsland() {
  const [token, setToken] = useState('');
  const [list, setList] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [authed, setAuthed] = useState(false);
  const [form, setForm] = useState<Song>({
    slug: '',
    title: '',
    artist: '',
    language: 'id',
    body: '',
  });

  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

  const load = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/songs', { headers, credentials: 'same-origin' });
    const json = (await res.json()) as ApiResponse<Song[]>;
    if (json.ok) setList(json.data);
    else setMessage(json.error);
    setLoading(false);
  };

  const authAndLoad = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!token) {
      setMessage('Masukkan token');
      return;
    }
    const res = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        ...(headers ?? {}),
      },
      credentials: 'same-origin',
    });
    if (!res.ok) {
      setAuthed(false);
      setMessage('Token salah atau tidak diisi');
      return;
    }
    setAuthed(true);
    await load();
    setToken('');
  };

  const remove = async (slug: string) => {
    const res = await fetch(`/api/admin/songs?slug=${encodeURIComponent(slug)}`, {
      method: 'DELETE',
      headers,
      credentials: 'same-origin',
    });
    const json = (await res.json()) as ApiResponse<null>;
    setMessage(json.ok ? 'Dihapus' : json.error);
    if (json.ok) load();
  };

  const submitSong = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const res = await fetch('/api/admin/songs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify(form),
    });
    const json = (await res.json()) as ApiResponse<Song>;
    if (json.ok) {
      setMessage('Disimpan');
      setForm({ slug: '', title: '', artist: '', language: 'id', body: '' });
      load();
    } else setMessage(json.error);
  };

  const rebuild = async () => {
    const res = await fetch('/api/admin/reindex', { method: 'POST', headers, credentials: 'same-origin' });
    const json = (await res.json()) as ApiResponse<null>;
    setMessage(json.ok ? 'FTS di-rebuild' : json.error);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={authAndLoad} className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
        <label className="text-sm text-slate-300">Admin token</label>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50"
            placeholder="Paste ADMIN_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <button
            className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            type="submit"
          >
            Masuk
          </button>
        </div>
        {!authed && <p className="mt-2 text-xs text-slate-500">Token wajib untuk memuat dashboard.</p>}
      </form>

      {authed && (
        <>
          <form onSubmit={submitSong} className="space-y-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Slug" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} required />
              <Input label="Judul" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
              <Input label="Artist" value={form.artist ?? ''} onChange={(v) => setForm({ ...form, artist: v })} />
              <Input
                label="Bahasa"
                value={form.language ?? 'id'}
                onChange={(v) => setForm({ ...form, language: v })}
                required
              />
            </div>
            <label className="text-sm text-slate-300">Lirik</label>
            <textarea
              className="w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50"
              rows={8}
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              required
            />
            <button
              type="submit"
              className="rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
            >
              Simpan
            </button>
          </form>

          {message && <p className="text-sm text-cyan-200">{message}</p>}

          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-50">Daftar Lagu</h2>
              <button
                type="button"
                onClick={load}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:border-cyan-400"
              >
                Refresh
              </button>
            </div>
            <button
              type="button"
              onClick={rebuild}
              className="mt-3 rounded border border-slate-700 px-3 py-1 text-xs text-cyan-200 hover:border-cyan-400"
            >
              Rebuild FTS index
            </button>
            {loading ? (
              <p className="mt-3 text-sm text-slate-400">Memuat…</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {list.map((item) => (
                  <li key={item.slug} className="flex items-center justify-between rounded border border-slate-800 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-50">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.slug}</p>
                    </div>
                    <button
                      className="text-xs text-rose-300 hover:text-rose-200"
                      onClick={() => remove(item.slug)}
                    >
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <label className="text-sm text-slate-300">
      {label}
      <input
        className="mt-1 w-full rounded border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
      />
    </label>
  );
}
