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
      <Skeleton className="h-9 w-full max-w-md" />
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  )
}
