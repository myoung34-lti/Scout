'use client'

import { useState, useTransition } from 'react'
import { RotateCcw } from 'lucide-react'
import { restoreVersion } from '@/lib/actions/prompts'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { PromptVersion, User } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' })

type VersionWithAuthor = PromptVersion & { createdBy: User }

export function VersionHistoryDialog({
  promptId,
  versions,
  currentVersionId,
}: {
  promptId: string
  versions: VersionWithAuthor[]
  currentVersionId: string | null
}) {
  const [inspecting, setInspecting] = useState<VersionWithAuthor | null>(null)
  const [pending, startTransition] = useTransition()

  function handleRestore(versionId: string) {
    startTransition(async () => {
      await restoreVersion(promptId, versionId)
      setInspecting(null)
    })
  }

  return (
    <>
      <div className="space-y-1.5">
        <p className="text-sm font-medium">Version History</p>
        <ul className="divide-y rounded-lg border">
          {versions.map((v) => {
            const isCurrent = v.id === currentVersionId
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setInspecting(v)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">v{v.version}</span>
                    <span>{dateFormatter.format(v.createdAt)}</span>
                    <span className="text-muted-foreground">{v.createdBy.name}</span>
                  </span>
                  {isCurrent && (
                    <span className="text-xs font-medium tracking-wide text-primary uppercase">
                      Current
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Version {inspecting?.version}</DialogTitle>
            <DialogDescription>
              {inspecting && (
                <>
                  Created {dateFormatter.format(inspecting.createdAt)} by{' '}
                  {inspecting.createdBy.name}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={inspecting?.content ?? ''}
            readOnly
            rows={16}
            className="field-sizing-fixed resize-none overflow-y-auto font-mono text-sm"
          />

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setInspecting(null)}>
              Close
            </Button>
            {inspecting && inspecting.id !== currentVersionId && (
              <Button
                onClick={() => handleRestore(inspecting.id)}
                disabled={pending}
              >
                <RotateCcw />
                {pending ? 'Restoring…' : 'Restore as New Version'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
