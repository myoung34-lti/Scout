'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { addCandidateToJob } from '@/lib/actions/candidates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function AddToJobDialog({
  candidateId,
  eligibleJobs,
}: {
  candidateId: string
  eligibleJobs: { id: string; internalName: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [jobId, setJobId] = useState<string | undefined>(undefined)
  const [pending, startTransition] = useTransition()

  function handleSubmit() {
    if (!jobId) return

    startTransition(async () => {
      try {
        await addCandidateToJob(candidateId, jobId)
        toast.success('Added to job pipeline.')
        setOpen(false)
        setJobId(undefined)
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Failed to add candidate to job.'
        )
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add to Another Job
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to another job</DialogTitle>
          <DialogDescription>
            Starts a new application for this candidate at the Applied stage.
            Their existing applications are not affected.
          </DialogDescription>
        </DialogHeader>

        {eligibleJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No other open jobs to add this candidate to.
          </p>
        ) : (
          <Select value={jobId} onValueChange={setJobId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a job" />
            </SelectTrigger>
            <SelectContent>
              {eligibleJobs.map((job) => (
                <SelectItem key={job.id} value={job.id}>
                  {job.internalName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DialogFooter className="mt-4 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!jobId || pending}>
            {pending ? 'Adding…' : 'Add to job'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
