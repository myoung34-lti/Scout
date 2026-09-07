'use client'

import { createContext, useContext, useState } from 'react'
import {
  ComposeEmailDialog,
  type ComposeEmailDialogProps,
} from '@/components/candidates/compose-email-dialog'

// Who the email is about. Separated from the recruiter/template globals so a
// list screen can supply one provider and pick the candidate at open time.
export type ComposeEmailTarget = Pick<
  ComposeEmailDialogProps,
  | 'candidateId'
  | 'candidateEmail'
  | 'candidateFirstName'
  | 'candidateLastName'
  | 'candidateCurrentCompany'
  | 'candidateCurrentTitle'
  | 'jobTitle'
  | 'jobLocation'
  | 'applicationId'
>

type ComposeEmailGlobals = Pick<
  ComposeEmailDialogProps,
  'recruiterName' | 'recruiterEmail' | 'staticVariables' | 'emailTemplates'
>

type ComposeEmailContextValue = {
  openComposeEmail: (target?: ComposeEmailTarget) => void
}

const ComposeEmailContext = createContext<ComposeEmailContextValue | null>(null)

// Mounts one controlled ComposeEmailDialog and exposes openComposeEmail() to
// any descendant. On a candidate page `defaultTarget` is that candidate and
// callers pass nothing; on a list every row passes its own target.
export function ComposeEmailProvider({
  children,
  defaultTarget,
  ...globals
}: ComposeEmailGlobals & {
  children: React.ReactNode
  defaultTarget?: ComposeEmailTarget
}) {
  const [target, setTarget] = useState<ComposeEmailTarget | null>(defaultTarget ?? null)
  const [open, setOpen] = useState(false)

  function openComposeEmail(next?: ComposeEmailTarget) {
    const resolved = next ?? defaultTarget
    if (!resolved) return
    setTarget(resolved)
    setOpen(true)
  }

  return (
    <ComposeEmailContext.Provider value={{ openComposeEmail }}>
      {children}
      {target && (
        // Keyed by candidate so a half-written draft for one person can never
        // carry over into the dialog for the next.
        <ComposeEmailDialog
          key={target.candidateId}
          {...globals}
          {...target}
          open={open}
          onOpenChange={setOpen}
          showTrigger={false}
        />
      )}
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
