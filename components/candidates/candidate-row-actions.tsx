'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal, UserRound, Briefcase, Bookmark, BookmarkX, Mail, Trash2, BriefcaseBusiness } from 'lucide-react'
import { toast } from 'sonner'
import {
  addCandidateToJob,
  addCandidateToTalentPool,
  removeCandidateFromTalentPool,
  removeFromJob,
} from '@/lib/actions/candidates'
import { DeleteCandidateDialog } from '@/components/candidates/delete-candidate-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useComposeEmail } from '@/components/candidates/compose-email-provider'
import type { ComposeEmailTarget } from '@/components/candidates/compose-email-provider'

export function CandidateRowActions({
  candidateId,
  candidateName,
  inTalentPool,
  jobs,
  composeTarget,
  currentApplication,
}: {
  candidateId: string
  candidateName: string
  inTalentPool: boolean
  jobs: { id: string; internalName: string }[]
  composeTarget: ComposeEmailTarget
  currentApplication: { id: string; jobName: string } | null
}) {
  const router = useRouter()
  const { openComposeEmail } = useComposeEmail()
  const [jobDialogOpen, setJobDialogOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [jobId, setJobId] = useState<string | undefined>()
  const [pending, startTransition] = useTransition()

  function togglePool() {
    startTransition(async () => {
      try {
        if (inTalentPool) {
          await removeCandidateFromTalentPool(candidateId)
          toast.success(`Removed ${candidateName} from the talent pool.`)
        } else {
          await addCandidateToTalentPool(candidateId)
          toast.success(`Added ${candidateName} to the talent pool.`)
        }
        router.refresh()
      } catch {
        toast.error("That didn't save. Please try again.")
      }
    })
  }

  function detachFromJob() {
    if (!currentApplication) return
    startTransition(async () => {
      try {
        await removeFromJob(currentApplication.id)
        toast.success(`Removed ${candidateName} from ${currentApplication.jobName}.`, {
          description: 'Their history on that job is kept.',
        })
        router.refresh()
      } catch {
        toast.error("Couldn't remove them from that job. Please try again.")
      }
    })
  }

  function submitJob() {
    if (!jobId) return
    startTransition(async () => {
      try {
        await addCandidateToJob(candidateId, jobId)
        setJobDialogOpen(false)
        setJobId(undefined)
        toast.success(`Added ${candidateName} to the job.`)
        router.refresh()
      } catch {
        toast.error("Couldn't add them to that job. They may already be on it.")
      }
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Actions for ${candidateName}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuItem onSelect={() => router.push(`/candidates/${candidateId}`)}>
            <UserRound className="size-4" />
            View profile
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => openComposeEmail(composeTarget)}
            disabled={!composeTarget.candidateEmail}
          >
            <Mail className="size-4" />
            Compose email
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setJobDialogOpen(true)}>
            <Briefcase className="size-4" />
            Add to job
          </DropdownMenuItem>
          {currentApplication && (
            <DropdownMenuItem onSelect={detachFromJob} disabled={pending}>
              <BriefcaseBusiness className="size-4" />
              Remove from {currentApplication.jobName}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={togglePool} disabled={pending}>
            {inTalentPool ? <BookmarkX className="size-4" /> : <Bookmark className="size-4" />}
            {inTalentPool ? 'Remove from talent pool' : 'Add to talent pool'}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" />
            Delete candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteCandidateDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        candidateId={candidateId}
        candidateName={candidateName}
      />

      <Dialog open={jobDialogOpen} onOpenChange={setJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {candidateName} to a job</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`job-${candidateId}`}>Job</Label>
            <Select value={jobId} onValueChange={setJobId}>
              <SelectTrigger id={`job-${candidateId}`} className="w-full">
                <SelectValue placeholder="Choose a job…" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map((j) => (
                  <SelectItem key={j.id} value={j.id}>
                    {j.internalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJobDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitJob} disabled={!jobId || pending}>
              {pending ? 'Adding…' : 'Add to job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
