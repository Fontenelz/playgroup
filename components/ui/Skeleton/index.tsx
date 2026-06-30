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
