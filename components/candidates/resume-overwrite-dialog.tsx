'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, FileWarning, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { applyResumeToCandidate } from '@/lib/actions/resumes'
import type { ResumeOverwritePreview } from '@/lib/resume-overwrite'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

// Nothing has been written to the candidate when this opens — the resume is
// attached, and these are the changes waiting on a yes. Dismissing leaves the
// profile exactly as it was, which is what makes the full replace safe to
// offer at all.
export function ResumeOverwriteDialog({
  preview,
  onResolved,
}: {
  preview: ResumeOverwritePreview | null
  onResolved: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function apply() {
    if (!preview) return
    startTransition(async () => {
      const result = await applyResumeToCandidate(preview.resumeId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Profile updated from resume.')
      onResolved()
      router.refresh()
    })
  }

  function keep() {
    onResolved()
    router.refresh()
  }

  const open = preview !== null

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && keep()}>
      <DialogContent className="sm:max-w-xl">
        {preview?.parseError ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileWarning className="size-4 text-warning" />
                Couldn&apos;t read {preview.fileName}
              </DialogTitle>
              <DialogDescription>
                {preview.parseError} The file is attached to this candidate — only
                the automatic scan failed, so nothing on the profile changed.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={keep}>Done</Button>
            </DialogFooter>
          </>
        ) : preview && !preview.hasChanges ? (
          <>
            <DialogHeader>
              <DialogTitle>Nothing to update</DialogTitle>
              <DialogDescription>
                {preview.fileName} is attached. Everything it contains already
                matches this candidate&apos;s profile.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={keep}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          preview && (
            <>
              <DialogHeader>
                <DialogTitle>Update profile from {preview.fileName}?</DialogTitle>
                <DialogDescription>
                  The resume is already attached. Applying it replaces the values
                  below with what this resume says.
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[52vh] pr-3">
                <div className="space-y-4">
                  {preview.fields.length > 0 && (
                    <ul className="space-y-2">
                      {preview.fields.map((field) => (
                        <li
                          key={field.label}
                          className="rounded-lg border border-border bg-muted/30 p-2.5 text-sm"
                        >
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {field.label}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={
                                field.before
                                  ? 'text-foreground-subtle line-through'
                                  : 'text-muted-foreground italic'
                              }
                            >
                              {field.before ?? 'empty'}
                            </span>
                            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
                            <span
                              className={
                                field.after
                                  ? 'font-medium'
                                  : 'text-danger italic'
                              }
                            >
                              {field.after ?? 'cleared'}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {(preview.tagsAdded.length > 0 || preview.tagsRemoved.length > 0) && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Tags — this resume becomes the full list
                        {preview.tagsKept.length > 0 &&
                          `, ${preview.tagsKept.length} unchanged`}
                      </p>
                      {preview.tagsRemoved.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-danger">Removed</span>
                          {preview.tagsRemoved.map((label) => (
                            <Badge key={label} variant="danger">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {preview.tagsAdded.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-success">Added</span>
                          {preview.tagsAdded.map((label) => (
                            <Badge key={label} variant="success">
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="flex gap-2 rounded-lg border border-warning-border bg-warning-soft/40 p-3 text-xs text-warning">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    <span>
                      The previous values are recorded on the activity timeline,
                      but there is no undo button. Rating, owner, talent-pool
                      status, applications and interviews are never touched.
                    </span>
                  </p>
                </div>
              </ScrollArea>

              <DialogFooter>
                <Button variant="outline" onClick={keep} disabled={pending}>
                  Keep existing
                </Button>
                <Button onClick={apply} disabled={pending}>
                  {pending ? 'Applying…' : 'Apply resume'}
                </Button>
              </DialogFooter>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
