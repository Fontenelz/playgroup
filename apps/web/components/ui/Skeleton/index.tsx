import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('rounded-lg animate-shimmer', className)} />
}

export function EventCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 space-y-3">
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-9 w-28" />
    </div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-2xl p-4 flex gap-3">
      <Skeleton className="size-14 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

// ─── Page-level loading fallback (usado pelos loading.tsx das rotas) ────────────

export function PageSkeleton({
  variant = 'generic',
  count = 3,
  showHeader = true,
}: {
  variant?: 'event' | 'group' | 'generic'
  count?: number
  showHeader?: boolean
}) {
  return (
    <div className="min-h-screen max-w-lg mx-auto px-4 py-4 space-y-4">
      {showHeader && (
        <div className="flex items-center gap-3 h-14 -mx-4 px-4">
          <Skeleton className="size-9 rounded-xl flex-shrink-0" />
          <Skeleton className="h-4 w-32" />
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) =>
          variant === 'group' ? (
            <GroupCardSkeleton key={i} />
          ) : variant === 'event' ? (
            <EventCardSkeleton key={i} />
          ) : (
            <Skeleton key={i} className="h-20 w-full" />
          ),
        )}
      </div>
    </div>
  )
}
