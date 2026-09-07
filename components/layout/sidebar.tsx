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
import { SidebarDrawer } from '@/components/layout/sidebar-drawer'

function SidebarBrand() {
  return (
    <Link href="/home" className="flex items-center gap-2.5">
      <ScoutMark className="size-6 shrink-0 text-sidebar-primary" />
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-bold tracking-tight text-sidebar-foreground">
          Scout
        </span>
        <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">
          Recruit · Track · Hire
        </span>
      </span>
    </Link>
  )
}

async function SidebarBody() {
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
    <>
      <div className="px-5 py-5">
        <SidebarBrand />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        <SidebarNavLinks />
      </div>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center justify-between gap-2">
          {user?.name && (
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
                <User className="size-3.5 text-sidebar-accent-foreground" />
              </div>
              <span className="truncate text-sm font-medium text-sidebar-foreground">
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
            className="w-full border-sidebar-border bg-transparent text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            Sign out
          </Button>
        </form>
        <div className="flex items-center justify-center gap-2 text-[11px] text-sidebar-foreground/45">
          Powered by
          <LtiMark className="h-4 w-auto text-sidebar-primary" />
        </div>
      </div>
    </>
  )
}

export async function Sidebar() {
  const body = await SidebarBody()

  return (
    <>
      {/* Below lg the sidebar becomes a drawer — before this it was a fixed
          240px column with no mobile behaviour at all. */}
      <SidebarDrawer>{body}</SidebarDrawer>
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col self-start bg-sidebar text-sidebar-foreground lg:flex">
        {body}
      </aside>
    </>
  )
}
