import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
    // Auto-reload on ChunkLoadError (new deployment with different chunk hashes)
    if (error.name === "ChunkLoadError" || error.message?.includes("Loading chunk")) {
      setTimeout(() => window.location.reload(), 100)
    }
  }

  handleReload() {
    window.location.reload();
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-card shadow-sm p-8 flex flex-col items-center text-center gap-5">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>

          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Terjadi Kesalahan
            </h1>

            <p className="mt-1.5 text-sm text-muted-foreground">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan muat ulang
              halaman untuk mencoba kembali.
            </p>

            {this.state.error?.message && (
              <p className="mt-3 rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground font-mono text-left break-all">
                {this.state.error.message}
              </p>
            )}
          </div>

          <button
            onClick={this.handleReload}
            className={[
              'w-full flex items-center justify-center rounded-md px-4 py-2.5',
              'bg-primary text-primary-foreground text-sm font-medium',
              'hover:bg-primary/90 active:bg-primary/80 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background',
            ].join(' ')}
          >
            Muat Ulang Halaman
          </button>
        </div>
      </div>
    );
  }
}
