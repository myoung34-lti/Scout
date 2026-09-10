'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { deleteResume, uploadResumeForReview } from '@/lib/actions/resumes'
import type { ResumeOverwritePreview } from '@/lib/resume-overwrite'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FileInput } from '@/components/ui/file-input'
import { ResumeOverwriteDialog } from '@/components/candidates/resume-overwrite-dialog'

export type ResumeListItem = {
  id: string
  fileName: string
  uploadedAt: Date
}

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

export function ResumeSection({
  candidateId,
  resumes,
}: {
  candidateId: string
  resumes: ResumeListItem[]
}) {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Uploading several files at once yields several previews. They queue and
  // are reviewed one at a time rather than being merged, since each resume
  // proposes a complete replacement of its own.
  const [queue, setQueue] = useState<ResumeOverwritePreview[]>([])
  const [pendingRemoval, setPendingRemoval] = useState<ResumeListItem | null>(null)
  const [removing, startRemoving] = useTransition()

  async function onFilesSelected(files: File[]) {
    if (files.length === 0) return
    setError(null)
    setUploading(true)
    const previews: ResumeOverwritePreview[] = []
    try {
      for (const file of files) {
        const result = await uploadResumeForReview(candidateId, file)
        if ('error' in result) {
          setError(result.error)
          break
        }
        previews.push(result.preview)
      }
    } catch {
      setError("Couldn't upload that file. Please try again.")
    } finally {
      setUploading(false)
    }
    // The files are attached at this point regardless of what the reviewer
    // does with the proposed profile changes.
    router.refresh()
    if (previews.length > 0) setQueue(previews)
  }

  function confirmRemoval() {
    const target = pendingRemoval
    if (!target) return
    startRemoving(async () => {
      const result = await deleteResume(target.id)
      if (result.error) {
        toast.error(result.error)
        return
      }
      setPendingRemoval(null)
      toast.success(`${target.fileName} removed.`)
      router.refresh()
    })
  }

  return (
    <>
      {resumes.length > 0 && (
        <ul className="mb-3 space-y-1">
          {resumes.map((resume) => (
            <li
              key={resume.id}
              className="group flex items-center gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/50"
            >
              <a
                href={`/api/resumes/${resume.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {resume.fileName}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {dateFormatter.format(resume.uploadedAt)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                // Always reachable — hover-only controls are invisible on
                // touch — just quieter until the row is hovered.
                className="size-7 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:text-danger group-hover:opacity-100"
                aria-label={`Remove ${resume.fileName}`}
                onClick={() => setPendingRemoval(resume)}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <FileInput
          name="file"
          accept=".pdf,.doc,.docx"
          multiple
          onFilesSelected={onFilesSelected}
        />
        {uploading && (
          <p className="text-sm text-muted-foreground">Uploading and scanning…</p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <ResumeOverwriteDialog
        preview={queue[0] ?? null}
        onResolved={() => setQueue((rest) => rest.slice(1))}
      />

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(next) => !next && !removing && setPendingRemoval(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TriangleAlert className="size-4 text-danger" />
              Remove this resume?
            </DialogTitle>
            <DialogDescription className="break-all">
              {pendingRemoval?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="rounded-lg border border-danger-border bg-danger-soft/40 p-3 text-danger">
              This deletes the file permanently. There is no recovery — unlike a
              deleted candidate, a removed resume is not kept for 30 days.
            </p>
            <p className="text-muted-foreground">
              The name, contact details, tags and work history already pulled from
              it stay on the profile. Edit the candidate, or upload the correct
              resume, to change those.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRemoval(null)}
              disabled={removing}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRemoval} disabled={removing}>
              {removing ? 'Removing…' : 'Remove resume'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
