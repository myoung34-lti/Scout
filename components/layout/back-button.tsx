'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

// Always returns to wherever the user actually came from (browser history),
// rather than a hardcoded destination — the same detail page can be reached
// from more than one list (e.g. a candidate profile from Candidates or from
// Pipeline), so a fixed "Back to X" link is wrong as often as it's right.
export function BackButton({ className }: { className?: string }) {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={cn(
        'inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  )
}
