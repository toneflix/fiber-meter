/*
 * Minimal, dependency-free toast system. Backed by a zustand store so it can be
 * fired from anywhere (including the data layer) without prop drilling or a
 * context. Render <Toaster /> once near the app root.
 */
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from './utils';
import { useToastStore } from './toast-store';

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 rounded-lg border bg-white p-3 shadow-lg',
            t.kind === 'success' ? 'border-green-200' : 'border-red-200',
          )}>
          {t.kind === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          )}
          <span className="flex-1 text-sm text-zinc-800">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
