import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

// Matches the shape of a data table so route-level loading states line up
// with the content that replaces them instead of jumping.
function SkeletonTable({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs">
      <div className="flex items-center gap-4 border-b border-border-strong px-3 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={cn("h-3", i === 0 ? "w-40" : "w-20")} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 border-b border-border px-3 py-3.5 last:border-0">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className={cn("h-4", i === 0 ? "w-48" : "w-16")} />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonTable }
