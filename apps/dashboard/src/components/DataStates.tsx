/*
 * Shared loading / error / empty presentational states so every page behaves
 * consistently in Live mode (skeletons while fetching, a clear banner if the
 * API is unreachable, friendly empty states).
 */
import { AlertTriangle } from 'lucide-react';
import { Skeleton } from './ui/Skeleton';
import { TableCell, TableRow } from './ui/Table';

export function LiveErrorBanner({ error }: { error: Error | null }) {
  if (!error) return null;
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">Couldn&apos;t reach the FiberMeter API</div>
        <div className="text-red-700">
          {error.message}. Check that the API is running, or switch to demo mode.
        </div>
      </div>
    </div>
  );
}

/* Skeleton rows for a table body while data is loading. */
export function TableSkeletonRows({ rows = 4, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c}>
              <Skeleton className="h-4 w-full max-w-[160px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
