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
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-7" />
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-5" />
      </div>
    </div>
  )
}
