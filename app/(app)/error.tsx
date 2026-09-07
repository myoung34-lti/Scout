'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server-side detail stays server-side; the digest is what correlates a
    // user's report with the actual log line.
    console.error('App route error:', error.digest ?? error.message)
  }, [error])

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        description="This page didn't load. Trying again usually works — if it doesn't, the reference below helps us track it down."
        action={
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/home">Go to Home</Link>
              </Button>
              <Button onClick={reset}>Try again</Button>
            </div>
            {error.digest && (
              <p className="font-mono text-xs text-muted-foreground">
                Reference: {error.digest}
              </p>
            )}
          </div>
        }
      />
    </div>
  )
}
