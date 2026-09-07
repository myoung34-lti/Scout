import { Skeleton } from '@/components/ui/skeleton'

// Only on routes with no notFound()-calling descendants: a loading boundary
// above notFound() leaves the 404 stuck on an unresolved suspense
// placeholder, which is far worse than having no skeleton.
export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-64 shrink-0 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
