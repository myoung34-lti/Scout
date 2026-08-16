'use client'

import { useRef, useState } from 'react'
import { useActionState } from 'react'
import { createCandidate, checkDuplicateByEmail } from '@/lib/actions/candidates'
import { parseResume } from '@/lib/actions/resume-parser'
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
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
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
  const [parsing, setParsing] = useState(false)
  const [parseNotice, setParseNotice] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  async function handleEmailBlur(e: React.FocusEvent<HTMLInputElement>) {
    const email = e.target.value.trim()
    if (!email || email === dismissedEmail) return

    const match = await checkDuplicateByEmail(email)
    if (match) {
      setDuplicate(match)
      setDialogOpen(true)
    }
  }

  async function handleResumeSelected(files: File[]) {
    const file = files[0]
    if (!file) return

    setParsing(true)
    setParseNotice(null)

    const result = await parseResume(file)

    if ('error' in result) {
      setParseNotice(result.error)
      setParsing(false)
      return
    }

    const form = formRef.current
    if (form) {
      const fill = (name: string, value?: string) => {
        if (!value) return
        const field = form.elements.namedItem(name)
        if (field instanceof HTMLInputElement && !field.value) {
          field.value = value
        }
      }
      fill('firstName', result.data.firstName)
      fill('lastName', result.data.lastName)
      fill('email', result.data.email)
      fill('phone', result.data.phone)
      fill('linkedinUrl', result.data.linkedinUrl)
      fill('currentCompany', result.data.currentCompany)
      fill('location', result.data.location)
    }

    if (result.data.skills && result.data.skills.length > 0) {
      setSkills(result.data.skills)
    }

    setParseNotice('Filled in from the resume — please review before saving.')
    setParsing(false)
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="resume">Resume (optional)</Label>
        <FileInput
          id="resume"
          name="resume"
          accept=".pdf,.doc,.docx"
          multiple
          onFilesSelected={handleResumeSelected}
        />
        {parsing && (
          <p className="text-sm text-muted-foreground">Reading resume…</p>
        )}
        {!parsing && parseNotice && (
          <p className="text-sm text-muted-foreground">{parseNotice}</p>
        )}
        {skills.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">
              Skills found in the resume — added as tags, remove any that don&apos;t fit:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1 pr-1">
                  {skill}
                  <input type="hidden" name="skills" value={skill} />
                  <button
                    type="button"
                    onClick={() =>
                      setSkills((prev) => prev.filter((s) => s !== skill))
                    }
                    aria-label={`Remove ${skill}`}
                    className="rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
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
