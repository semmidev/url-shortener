export default function LoadingFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-card border border-border/40 shadow-lg max-w-[220px] text-center">
        <div className="relative flex items-center justify-center w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-primary border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground tracking-wide">Memuat Halaman</p>
          <p className="text-xs text-muted-foreground/80 font-medium animate-pulse">Menyiapkan materi terbaik...</p>
        </div>
      </div>
    </div>
  );
}
