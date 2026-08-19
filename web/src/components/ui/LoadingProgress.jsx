import { createPortal } from 'react-dom';
import { useLoadingStore } from '../../hooks/useLoadingStore';

export default function LoadingProgress() {
  const { isOpen, title, message } = useLoadingStore();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-xl p-6 shadow-lg flex flex-col items-center gap-3 min-w-48">
        <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-20" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        {title && <p className="text-sm font-semibold text-foreground">{title}</p>}
        {message && <p className="text-xs text-muted-foreground text-center">{message}</p>}
      </div>
    </div>,
    document.body
  );
}
