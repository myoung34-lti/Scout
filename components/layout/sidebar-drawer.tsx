'use client'

import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScoutMark } from '@/components/icons/scout-mark'

export function SidebarDrawer({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur lg:hidden">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open navigation"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <Menu />
        </Button>
        <span className="flex items-center gap-2">
          <ScoutMark className="size-5 text-primary" />
          <span className="font-heading text-base font-bold tracking-tight">Scout</span>
        </span>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          {/* The nav links are server-rendered children, so a click here is
              how a navigation dismisses the drawer. */}
          <div
            className="relative flex h-full w-64 flex-col bg-sidebar text-sidebar-foreground shadow-lg"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest('a')) setOpen(false)
            }}
          >
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Close navigation"
              className="absolute right-3 top-5 z-10 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => setOpen(false)}
            >
              <X />
            </Button>
            {children}
          </div>
        </div>
      )}
    </>
  )
}
