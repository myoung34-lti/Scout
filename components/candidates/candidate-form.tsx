'use client'

import { useEffect, useRef, useState } from 'react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { X } from 'lucide-react'
import type { Job, User } from '@prisma/client'
import { ALL_CANDIDATE_SOURCES, CANDIDATE_SOURCE_LABELS } from '@/lib/candidate-source'
import { ACTIVE_STAGES, STAGE_LABELS } from '@/lib/pipeline'
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
  currentUserId,
}: {
  jobs: Job[]
  users: User[]
  defaultJobId?: string
  currentUserId?: string
}) {
  const [state, formAction, pending] = useActionState<
    CandidateFormState | undefined,
    FormData
  >(createCandidate, undefined)

  const [jobId, setJobId] = useState(defaultJobId)
  const [stage, setStage] = useState<string | undefined>(undefined)
  const [addToTalentPool, setAddToTalentPool] = useState(false)
  const [ownerId, setOwnerId] = useState<string | undefined>(currentUserId)
  const [source, setSource] = useState<string | undefined>(undefined)
  const [duplicate, setDuplicate] = useState<DuplicateCandidate | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dismissedEmail, setDismissedEmail] = useState<string | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parseNotice, setParseNotice] = useState<string | null>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [fields, setFields] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    currentCompany: '',
    location: '',
  })
  const formRef = useRef<HTMLFormElement>(null)
  const resumeFiles = useRef<File[]>([])

  function updateField(name: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [name]: e.target.value }))
  }

  // React resets uncontrolled form fields (including file inputs) after any
  // action call, success or failure — restore the picked file(s) so a
  // validation error doesn't silently drop the resume the user already chose.
  useEffect(() => {
    if (!state || resumeFiles.current.length === 0) return
    const input = formRef.current?.elements.namedItem('resume')
    if (input instanceof HTMLInputElement) {
      const dataTransfer = new DataTransfer()
      resumeFiles.current.forEach((f) => dataTransfer.items.add(f))
      input.files = dataTransfer.files
    }
  }, [state])

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
    resumeFiles.current = files

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

    setFields((prev) => ({
      firstName: prev.firstName || result.data.firstName || prev.firstName,
      lastName: prev.lastName || result.data.lastName || prev.lastName,
      email: prev.email || result.data.email || prev.email,
      phone: prev.phone || result.data.phone || prev.phone,
      linkedinUrl: prev.linkedinUrl || result.data.linkedinUrl || prev.linkedinUrl,
      currentCompany: prev.currentCompany || result.data.currentCompany || prev.currentCompany,
      location: prev.location || result.data.location || prev.location,
    }))

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
          <Input
            id="firstName"
            name="firstName"
            required
            value={fields.firstName}
            onChange={updateField('firstName')}
          />
          {state?.errors?.firstName && (
            <p className="text-sm text-destructive">
              {state.errors.firstName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            required
            value={fields.lastName}
            onChange={updateField('lastName')}
          />
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
          <Input
            id="email"
            name="email"
            type="email"
            value={fields.email}
            onChange={updateField('email')}
            onBlur={handleEmailBlur}
          />
          {state?.errors?.email && (
            <p className="text-sm text-destructive">{state.errors.email[0]}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            value={fields.phone}
            onChange={updateField('phone')}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="currentCompany">Current company</Label>
          <Input
            id="currentCompany"
            name="currentCompany"
            value={fields.currentCompany}
            onChange={updateField('currentCompany')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            value={fields.location}
            onChange={updateField('location')}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
          <Input
            id="linkedinUrl"
            name="linkedinUrl"
            value={fields.linkedinUrl}
            onChange={updateField('linkedinUrl')}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Recruiter</Label>
          <Select name="ownerId" value={ownerId} onValueChange={setOwnerId}>
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

      <div className="space-y-4 rounded-lg border p-4">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select name="source" value={source} onValueChange={setSource}>
              <SelectTrigger id="source" className="w-full">
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CANDIDATE_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CANDIDATE_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {state?.errors?.source && (
              <p className="text-sm text-destructive">{state.errors.source[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="jobId">Job</Label>
            {addToTalentPool ? (
              <p className="text-sm text-muted-foreground">
                No job — this candidate will be added directly to the Talent Pool.
              </p>
            ) : (
              <>
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
              </>
            )}
            <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">
              <Checkbox
                checked={addToTalentPool}
                onCheckedChange={(checked) => setAddToTalentPool(checked === true)}
              />
              No job yet — add to Talent Pool
            </label>
            <input
              type="hidden"
              name="addToTalentPool"
              value={addToTalentPool ? 'true' : 'false'}
            />
          </div>

          {!addToTalentPool && (
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select name="stage" value={stage} onValueChange={setStage}>
                <SelectTrigger id="stage" className="w-full">
                  <SelectValue placeholder="Applied" />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVE_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
