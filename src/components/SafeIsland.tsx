import { Component, type ReactNode } from 'react';

type Props = { children: ReactNode; fallback?: ReactNode; name?: string };

type State = { hasError: boolean };

export class SafeIsland extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Island error', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          Terjadi kesalahan saat memuat komponen. Coba muat ulang halaman.
        </div>
      );
    }
    return this.props.children;
  }
}
