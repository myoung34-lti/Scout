'use client'

import { createContext, useContext, useState } from 'react'
import {
  ComposeEmailDialog,
  type ComposeEmailDialogProps,
} from '@/components/candidates/compose-email-dialog'

type ComposeEmailContextValue = {
  openComposeEmail: () => void
}

const ComposeEmailContext = createContext<ComposeEmailContextValue | null>(null)

// Mounts one controlled ComposeEmailDialog per candidate page and exposes
// openComposeEmail() to any descendant — the stepper (stage-change toast
// action) and the Communication tab (its own button) both open the same
// dialog instance instead of each needing the full candidate/job/recruiter
// context threaded down to them individually.
export function ComposeEmailProvider({
  children,
  ...dialogProps
}: Omit<ComposeEmailDialogProps, 'open' | 'onOpenChange' | 'showTrigger'> & {
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <ComposeEmailContext.Provider value={{ openComposeEmail: () => setOpen(true) }}>
      {children}
      <ComposeEmailDialog
        {...dialogProps}
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
      />
    </ComposeEmailContext.Provider>
  )
}

export function useComposeEmail(): ComposeEmailContextValue {
  const ctx = useContext(ComposeEmailContext)
  if (!ctx) {
    throw new Error('useComposeEmail must be used within a ComposeEmailProvider')
  }
  return ctx
}
