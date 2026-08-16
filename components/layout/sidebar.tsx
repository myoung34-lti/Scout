import Link from 'next/link'
import { User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/lib/actions/auth'
import { prisma } from '@/lib/db'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { ScoutMark } from '@/components/icons/scout-mark'
import { LtiMark } from '@/components/icons/lti-mark'
import { SidebarNavLinks } from '@/components/layout/sidebar-nav-links'

export async function Sidebar() {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const user = authUser
    ? await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { name: true },
      })
    : null

  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 self-start flex-col bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <Link href="/jobs" className="flex items-center gap-2 font-semibold tracking-tight">
          <ScoutMark className="size-6 text-sidebar-primary" />
          <span className="text-lg">Scout</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <SidebarNavLinks />
      </div>

      <div className="space-y-3 border-t border-sidebar-border bg-black p-4">
        <div className="flex items-center justify-between gap-2">
          {user?.name && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
                <User className="size-4 text-sidebar-accent-foreground" />
              </div>
              <span className="truncate text-sm text-sidebar-foreground">
                {user.name}
              </span>
            </div>
          )}
          <ThemeToggle />
        </div>
        <form action={logout}>
          <Button
            variant="outline"
            size="sm"
            type="submit"
            className="w-full border-sidebar-border bg-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Sign out
          </Button>
        </form>
        <div className="flex items-center justify-center gap-2 text-[11px] text-sidebar-foreground/50">
          Powered by
          <LtiMark className="h-4 w-auto text-sidebar-primary" />
        </div>
      </div>
    </aside>
  )
}
