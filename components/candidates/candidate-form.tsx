'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { createCandidate, checkDuplicateByEmail } from '@/lib/actions/candidates'
import { DuplicateWarningDialog } from '@/components/candidates/duplicate-warning-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Job, User } from '@prisma/client'
import { ALL_CANDIDATE_TYPES, CANDIDATE_TYPE_LABELS } from '@/lib/candidate-type'
import { FileInput } from '@/components/ui/file-input'

type CandidateFormState = {
  errors?: Record<string, string[] | undefined>
}

type DuplicateCandidate = {
  firstName: string
  lastName: string
  email: string | null
}

export function CandidateForm({
  jobs,
  users,
  defaultJobId,
}: {
  jobs: Job[]
  users: User[]
  defaultJobId?: string
}) {
  const [state, formAction, pending] = useActionState<
    CandidateFormState | undefined,
    FormData
  >(createCandidate, undefined)

  const [jobId, setJobId] = useState(defaultJobId)
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dismissedEmail, setDismissedEmail] = useState<string | null>(null)

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim()
    if (!email || email === dismissedEmail) return

    const match = await checkDuplicateByEmail(email)
    if (match) {
      setDuplicate(match)
      setDialogOpen(true)
    }
  }

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="resume">Resume (optional)</Label>
        <FileInput id="resume" name="resume" accept=".pdf,.doc,.docx" multiple />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
          {state?.errors?.firstName && (
            <p className="text-sm text-destructive">
              {state.errors.firstName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
          {state?.errors?.lastName && (
            <p className="text-sm text-destructive">
              {state.errors.lastName[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" onBlur={handleEmailBlur} />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="candidateType">Type</Label>
          <Select name="candidateType">
            <SelectTrigger id="candidateType" className="w-full">
              <SelectValue placeholder="Select a type" />
            </SelectTrigger>
            <SelectContent>
              {ALL_CANDIDATE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {CANDIDATE_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.candidateType && (
            <p className="text-sm text-destructive">
              {state.errors.candidateType[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="currentCompany">Current company</Label>
          <Input id="currentCompany" name="currentCompany" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input id="location" name="location" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input id="linkedinUrl" name="linkedinUrl" type="url" />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="jobId">Job</Label>
          <Select name="jobId" value={jobId} onValueChange={setJobId}>
            <SelectTrigger id="jobId" className="w-full">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.internalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {state?.errors?.jobId && (
            <p className="text-sm text-destructive">{state.errors.jobId[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Owner</Label>
          <Select name="ownerId">
            <SelectTrigger id="ownerId" className="w-full">
              <SelectValue placeholder="Unassigned" />
            </SelectTrigger>
            <SelectContent>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Create candidate'}
      </Button>

      {duplicate && (
        <DuplicateWarningDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          candidate={duplicate}
          onContinueAnyway={() => {
            setDismissedEmail(duplicate.email)
            setDuplicate(null)
          }}
        />
      )}
    </form>
  )
}
