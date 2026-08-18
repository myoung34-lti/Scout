'use client'

import { useActionState, useState } from 'react'
import { Pencil, X } from 'lucide-react'
import { updateCandidateProfile } from '@/lib/actions/candidates'
import { parseResume, type WorkHistoryEntry } from '@/lib/actions/resume-parser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { FileInput } from '@/components/ui/file-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ALL_CANDIDATE_SOURCES, CANDIDATE_SOURCE_LABELS } from '@/lib/candidate-source'
import type { CandidateSource } from '@prisma/client'

type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  currentCompany: string | null
  currentTitle: string | null
  location: string | null
  source: CandidateSource | null
  ownerId: string | null
}

export function EditCandidateDialog({
  candidate,
  users,
}: {
  candidate: Candidate
  users: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [scan, setScan] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseNotice, setParseNotice] = useState<string | null>(null)
  const [fields, setFields] = useState({
    email: candidate.email ?? '',
    phone: candidate.phone ?? '',
    linkedinUrl: candidate.linkedinUrl ?? '',
    currentCompany: candidate.currentCompany ?? '',
    location: candidate.location ?? '',
  })
  const [skills, setSkills] = useState<string[]>([])
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[] | null>(null)
  const [yearsExperience, setYearsExperience] = useState<number | null>(null)

  const boundAction = updateCandidateProfile.bind(null, candidate.id)
  const [state, formAction, pending] = useActionState(
    async (
      prevState: { errors?: Record<string, string[] | undefined>; success?: true } | undefined,
      formData: FormData
    ): Promise<{ errors?: Record<string, string[] | undefined>; success?: true }> => {
      const result = await boundAction(prevState, formData)
      if (result?.success) setOpen(false)
      return result
    },
    undefined
  )

  function updateField(key: keyof typeof fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleResumeSelected(files: File[]) {
    const file = files[0]
    if (!scan || !file) return

    setParsing(true)
    setParseNotice(null)
    const result = await parseResume(file)
    setParsing(false)

    if ('error' in result) {
      setParseNotice(result.error)
      return
    }

    setFields((prev) => ({
      email: result.data.email || prev.email,
      phone: result.data.phone || prev.phone,
      linkedinUrl: result.data.linkedinUrl || prev.linkedinUrl,
      currentCompany: result.data.currentCompany || prev.currentCompany,
      location: result.data.location || prev.location,
    }))
    if (result.data.skills && result.data.skills.length > 0) {
      setSkills(result.data.skills)
    }
    if (result.data.workHistory && result.data.workHistory.length > 0) {
      setWorkHistory(result.data.workHistory)
    }
    if (typeof result.data.yearsExperience === 'number') {
      setYearsExperience(result.data.yearsExperience)
    }
    setParseNotice('Filled in from the resume — review before saving.')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit Candidate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <Label htmlFor="edit-resume">Resume (optional)</Label>
            <FileInput
              id="edit-resume"
              name="resume"
              accept=".pdf,.doc,.docx"
              onFilesSelected={handleResumeSelected}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Checkbox checked={scan} onCheckedChange={(c) => setScan(c === true)} />
              Scan this resume to fill in the fields below
            </label>
            {parsing && (
              <p className="text-sm text-muted-foreground">Reading resume…</p>
            )}
            {!parsing && parseNotice && (
              <p className="text-sm text-muted-foreground">{parseNotice}</p>
            )}
            {state?.errors?.resume && (
              <p className="text-sm text-destructive">{state.errors.resume[0]}</p>
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
                        onClick={() => setSkills((prev) => prev.filter((s) => s !== skill))}
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
            {workHistory && workHistory.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">
                  Experience found in the resume — will replace what&apos;s on file
                  {yearsExperience ? ` (~${yearsExperience} years total)` : ''}:
                </p>
                <ul className="space-y-1 text-sm">
                  {workHistory.map((entry, i) => (
                    <li key={i} className="text-muted-foreground">
                      <span className="text-foreground">{entry.title}</span> — {entry.company}
                      {' · '}
                      {entry.isCurrent
                        ? 'Current'
                        : `${entry.startYear ?? '—'} – ${entry.endYear ?? '—'}`}
                    </li>
                  ))}
                </ul>
                <input type="hidden" name="workHistory" value={JSON.stringify(workHistory)} />
                {yearsExperience !== null && (
                  <input type="hidden" name="yearsExperience" value={yearsExperience} />
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First name</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                defaultValue={candidate.firstName}
                required
              />
              {state?.errors?.firstName && (
                <p className="text-sm text-destructive">
                  {state.errors.firstName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last name</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                defaultValue={candidate.lastName}
                required
              />
              {state?.errors?.lastName && (
                <p className="text-sm text-destructive">
                  {state.errors.lastName[0]}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                value={fields.email}
                onChange={updateField('email')}
              />
              {state?.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                value={fields.phone}
                onChange={updateField('phone')}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-currentCompany">Current company</Label>
              <Input
                id="edit-currentCompany"
                name="currentCompany"
                value={fields.currentCompany}
                onChange={updateField('currentCompany')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-currentTitle">Current title</Label>
              <Input
                id="edit-currentTitle"
                name="currentTitle"
                defaultValue={candidate.currentTitle ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                name="location"
                value={fields.location}
                onChange={updateField('location')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-linkedinUrl">LinkedIn URL</Label>
              <Input
                id="edit-linkedinUrl"
                name="linkedinUrl"
                value={fields.linkedinUrl}
                onChange={updateField('linkedinUrl')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-source">Source</Label>
            <Select name="source" defaultValue={candidate.source ?? 'NONE'}>
              <SelectTrigger id="edit-source" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">None</SelectItem>
                {ALL_CANDIDATE_SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {CANDIDATE_SOURCE_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-ownerId">Recruiter</Label>
            <Select name="ownerId" defaultValue={candidate.ownerId ?? 'NONE'}>
              <SelectTrigger id="edit-ownerId" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Unassigned</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
