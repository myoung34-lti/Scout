'use client'

import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { Mail, CalendarIcon, Clock, Sparkles } from 'lucide-react'
import {
  sendCandidateEmail,
  scheduleCandidateEmail,
  getMyGmailSignature,
} from '@/lib/actions/emails'
import { draftPersonalizedEmail } from '@/lib/actions/ai'
import { renderEmailTemplate } from '@/lib/email-template'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Calendar } from '@/components/ui/calendar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type EmailTemplate = {
  id: string
  name: string
  currentVersion: { id: string; subject: string; bodyHtml: string } | null
}

// 'idle' doubles as "loading" while the dialog is open — the fetch is
// guarded by a ref (not state) so kicking it off never needs a synchronous
// setState inside the effect that starts it.
type SignatureStatus = 'idle' | 'ready' | 'error'

export type ComposeEmailDialogProps = {
  candidateId: string
  candidateEmail: string | null
  candidateFirstName: string
  candidateLastName: string
  candidateCurrentCompany: string
  candidateCurrentTitle: string
  jobTitle: string
  jobLocation: string
  applicationId: string | null
  recruiterName: string
  recruiterEmail: string
  staticVariables: Record<string, string>
  emailTemplates: EmailTemplate[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function ComposeEmailDialog({
  candidateId,
  candidateEmail,
  candidateFirstName,
  candidateLastName,
  candidateCurrentCompany,
  candidateCurrentTitle,
  jobTitle,
  jobLocation,
  applicationId,
  recruiterName,
  recruiterEmail,
  staticVariables,
  emailTemplates,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  showTrigger = true,
}: ComposeEmailDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const [templateId, setTemplateId] = useState<string>('')
  const [emailTemplateVersionId, setEmailTemplateVersionId] = useState<string | null>(null)
  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [signature, setSignature] = useState('')
  const [signatureStatus, setSignatureStatus] = useState<SignatureStatus>('idle')
  const hasFetchedSignatureRef = useRef(false)
  const [signatureError, setSignatureError] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined)
  const [scheduleTime, setScheduleTime] = useState('09:00')
  const [schedulePopoverOpen, setSchedulePopoverOpen] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [personalizeInstruction, setPersonalizeInstruction] = useState('')
  const [personalizing, setPersonalizing] = useState(false)
  const [personalizeError, setPersonalizeError] = useState<string | null>(null)
  const [personalizePopoverOpen, setPersonalizePopoverOpen] = useState(false)

  const vars = {
    ...staticVariables,
    candidateFirstName,
    candidateLastName,
    candidateCurrentCompany,
    candidateCurrentTitle,
    jobTitle,
    jobLocation,
    recruiterName,
    recruiterEmail,
    recruiterSignature: signature,
  }

  function resetComposeState() {
    setTemplateId('')
    setEmailTemplateVersionId(null)
    setSubject('')
    setBodyHtml('')
    setScheduleDate(undefined)
    setScheduleTime('09:00')
    setSchedulePopoverOpen(false)
    setScheduleError(null)
    setError(null)
    setPersonalizeInstruction('')
    setPersonalizeError(null)
    setPersonalizePopoverOpen(false)
  }

  function setOpen(next: boolean) {
    if (onOpenChangeProp) onOpenChangeProp(next)
    else setInternalOpen(next)
  }

  // A plain onOpenChange handler only fires for Radix-internal open/close
  // interactions (Escape, overlay click, a DialogTrigger click) — it never
  // fires when a parent flips the `open` prop directly, which is exactly
  // how the stage-change toast and the Communication tab's button open this
  // dialog now (via ComposeEmailProvider). An effect keyed on `open` fires
  // regardless of which path opened it.
  useEffect(() => {
    if (!open || hasFetchedSignatureRef.current) return
    hasFetchedSignatureRef.current = true
    getMyGmailSignature().then((result) => {
      if ('error' in result) {
        setSignatureError(result.error)
        setSignatureStatus('error')
      } else {
        setSignature(result.signature)
        setSignatureStatus('ready')
      }
    })
  }, [open])

  function handleTemplateChange(id: string) {
    setTemplateId(id)
    const template = emailTemplates.find((t) => t.id === id)
    if (!template?.currentVersion) return
    setEmailTemplateVersionId(template.currentVersion.id)
    setSubject(renderEmailTemplate(template.currentVersion.subject, vars))
    // Signature is deliberately NOT appended here — it stays out of the
    // Tiptap-edited content entirely (see the signature preview below) and
    // is only concatenated back on at send time, so its original Gmail
    // formatting (colors, fonts, logo image) never passes through Tiptap's
    // schema, which would silently strip anything outside its supported
    // marks/nodes.
    setBodyHtml(renderEmailTemplate(template.currentVersion.bodyHtml, vars))
  }

  // The full outgoing body: edited message content + the untouched raw
  // signature HTML, joined only now — never fed through Tiptap together.
  function fullBodyHtml(): string {
    return `${bodyHtml}${signature}`
  }

  function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  }

  // AI drafts come back as plain text (paragraphs separated by a blank
  // line) — escaped and wrapped here rather than asking Claude for HTML
  // directly, same "never let raw text be parsed as markup" discipline as
  // the rest of this dialog.
  function plainTextToParagraphHtml(text: string): string {
    return text
      .split(/\n{2,}/)
      .map((para) => `<p>${escapeHtml(para.trim()).replace(/\n/g, '<br />')}</p>`)
      .join('')
  }

  const hasExistingDraft = Boolean(
    subject.trim() || bodyHtml.replace(/<[^>]*>/g, '').trim()
  )

  async function handlePersonalize() {
    setPersonalizeError(null)
    const trimmed = personalizeInstruction.trim()
    if (!trimmed) {
      setPersonalizeError('Enter what this email should do first.')
      return
    }
    setPersonalizing(true)
    const result = await draftPersonalizedEmail(candidateId, trimmed)
    setPersonalizing(false)
    if ('error' in result) {
      setPersonalizeError(result.error)
      return
    }
    setSubject(result.subject)
    setBodyHtml(plainTextToParagraphHtml(result.body))
    setEmailTemplateVersionId(null)
    setTemplateId('')
    setPersonalizeInstruction('')
    setPersonalizePopoverOpen(false)
  }

  function combinedScheduleDate(): Date | null {
    if (!scheduleDate) return null
    const [hours, minutes] = scheduleTime.split(':').map(Number)
    const combined = new Date(scheduleDate)
    combined.setHours(hours || 0, minutes || 0, 0, 0)
    return combined
  }

  async function handleSendNow() {
    setError(null)
    if (!candidateEmail) {
      setError('This candidate has no email address on file.')
      return
    }

    setSending(true)
    const result = await sendCandidateEmail(candidateId, {
      subject,
      bodyHtml: fullBodyHtml(),
      applicationId,
      emailTemplateVersionId,
    })
    setSending(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setOpen(false)
    resetComposeState()
  }

  async function handleScheduleConfirm() {
    setScheduleError(null)
    if (!candidateEmail) {
      setScheduleError('This candidate has no email address on file.')
      return
    }
    const scheduledFor = combinedScheduleDate()
    if (!scheduledFor) {
      setScheduleError('Pick a date and time to schedule for.')
      return
    }
    if (scheduledFor.getTime() <= Date.now()) {
      setScheduleError('Scheduled time must be in the future.')
      return
    }

    setSending(true)
    const result = await scheduleCandidateEmail(candidateId, {
      subject,
      bodyHtml: fullBodyHtml(),
      applicationId,
      emailTemplateVersionId,
      scheduledFor,
    })
    setSending(false)
    if ('error' in result) {
      setScheduleError(result.error)
      return
    }
    setOpen(false)
    resetComposeState()
  }

  const signatureLoading = signatureStatus === 'idle'

  const dialogBody = (
    <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Email {candidateFirstName} {candidateLastName}</DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {!candidateEmail && (
          <p className="text-sm text-destructive">
            This candidate has no email address on file — add one from Edit Candidate first.
          </p>
        )}

        {signatureStatus === 'error' && (
          <p className="text-sm text-destructive">{signatureError}</p>
        )}

        <div className="space-y-2">
          <Label>Email Type</Label>
          <Select
            value={templateId}
            onValueChange={handleTemplateChange}
            disabled={signatureLoading}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={signatureLoading ? 'Loading your signature…' : 'Choose a template…'}
              />
            </SelectTrigger>
            <SelectContent>
              {emailTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {emailTemplates.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No email templates yet — add one in the Email Templates library.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-subject">Subject</Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Body</Label>
            <Popover open={personalizePopoverOpen} onOpenChange={setPersonalizePopoverOpen}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm">
                  <Sparkles />
                  Personalize with Scout
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 space-y-3" align="end">
                <div className="space-y-2">
                  <Label htmlFor="personalize-instruction">What should this email do?</Label>
                  <Textarea
                    id="personalize-instruction"
                    value={personalizeInstruction}
                    onChange={(e) => setPersonalizeInstruction(e.target.value)}
                    placeholder="e.g. Check in while we wait for the technical interview"
                    rows={3}
                    className="field-sizing-fixed resize-none"
                  />
                </div>
                {hasExistingDraft && (
                  <p className="text-xs text-muted-foreground">
                    This will replace your current subject and body.
                  </p>
                )}
                {personalizeError && (
                  <p className="text-sm text-destructive">{personalizeError}</p>
                )}
                <Button
                  type="button"
                  className="w-full"
                  onClick={handlePersonalize}
                  disabled={personalizing}
                >
                  {personalizing ? 'Generating…' : 'Generate'}
                </Button>
              </PopoverContent>
            </Popover>
          </div>
          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Write the email…"
          />
          <p className="text-xs text-muted-foreground">
            Your Gmail signature is appended automatically when this sends.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Popover open={schedulePopoverOpen} onOpenChange={setSchedulePopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              disabled={sending || !candidateEmail || !subject.trim()}
            >
              <Clock />
              Send Later
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 space-y-3" align="end">
            <div className="space-y-2">
              <Label>Date &amp; time</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                    >
                      <CalendarIcon className="text-muted-foreground" />
                      {scheduleDate ? (
                        format(scheduleDate, 'MMM d, yyyy')
                      ) : (
                        <span className="text-muted-foreground">Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduleDate}
                      onSelect={setScheduleDate}
                      disabled={{ before: new Date() }}
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="w-28"
                />
              </div>
            </div>
            {scheduleError && <p className="text-sm text-destructive">{scheduleError}</p>}
            <Button
              type="button"
              className="w-full"
              onClick={handleScheduleConfirm}
              disabled={sending}
            >
              {sending ? 'Scheduling…' : 'Confirm Schedule'}
            </Button>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          onClick={handleSendNow}
          disabled={sending || !candidateEmail || !subject.trim()}
        >
          {sending ? 'Sending…' : 'Send'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {showTrigger && (
        <DialogTrigger asChild>
          <Button size="sm">
            <Mail />
            Compose Email
          </Button>
        </DialogTrigger>
      )}
      {dialogBody}
    </Dialog>
  )
}
