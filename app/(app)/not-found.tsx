import Link from 'next/link'
import { SearchX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'

// Catches the notFound() calls already in the candidate, job, prompt and
// email-template pages, which previously fell through to the unstyled
// Next.js default.
export default function NotFound() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that"
        description="It may have been deleted, or the link may be out of date."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/candidates">Candidates</Link>
            </Button>
            <Button asChild>
              <Link href="/home">Go to Home</Link>
            </Button>
          </div>
        }
      />
    </div>
  )
}
