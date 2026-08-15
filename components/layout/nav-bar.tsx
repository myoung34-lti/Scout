import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export async function NavBar() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 px-4">
        <nav className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Link href="/jobs" className="shrink-0 font-semibold">
            ATS
          </Link>
          <Link
            href="/jobs"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            Jobs
          </Link>
          <Link
            href="/candidates"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            Candidates
          </Link>
          <Link
            href="/pipeline"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground"
          >
            Pipeline
          </Link>
        </nav>
        <div className="flex shrink-0 items-center gap-3">
          {user?.email && (
            <span className="hidden truncate text-sm text-muted-foreground sm:inline">
              {user.email}
            </span>
          )}
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
