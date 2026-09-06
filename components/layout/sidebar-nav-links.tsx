'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Users, Kanban, Bookmark, ScrollText, Mail, ShieldCheck, BookOpen, BarChart3 } from 'lucide-react'

// Order is unchanged from before the redesign (decision #4) — the groups only
// add labels over the existing sequence so a nine-item list stays scannable.
const GROUPS = [
  {
    label: 'Recruiting',
    links: [
      { href: '/jobs', label: 'Jobs', icon: Briefcase },
      { href: '/candidates', label: 'Candidates', icon: Users },
      { href: '/pipeline', label: 'Pipeline', icon: Kanban },
      { href: '/talent-pool', label: 'Talent Pool', icon: Bookmark },
      { href: '/reporting', label: 'Reporting', icon: BarChart3 },
    ],
  },
  {
    label: 'Library',
    links: [
      { href: '/prompts', label: 'Prompt Library', icon: ScrollText },
      { href: '/email-templates', label: 'Email Templates', icon: Mail },
      { href: '/docs', label: 'User Docs', icon: BookOpen },
    ],
  },
  {
    label: 'Settings',
    links: [{ href: '/admin', label: 'Admin', icon: ShieldCheck }],
  },
]

export function SidebarNavLinks() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-5">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.11em] text-sidebar-muted">
            {group.label}
          </p>
          {group.links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`}
              >
                <Icon className={`size-4 shrink-0 ${active ? '' : 'opacity-80'}`} />
                {label}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
