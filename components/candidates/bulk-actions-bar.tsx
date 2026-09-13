'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, MoreHorizontal, UserMinus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { bulkStageAction, type BulkStageAction } from '@/lib/actions/pipeline'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { BulkRejectDialog } from '@/components/candidates/bulk-reject-dialog'
import type { RejectionReason } from '@prisma/client'

// Both rejecting actions need a reason before anything happens, so the choice
// of action is held until the dialog resolves.
type PendingReject = 'REJECT' | 'REJECT_TO_TALENT_POOL' | null

export function BulkActionsBar({
  selectedIds,
  onClear,
}: {
  selectedIds: string[]
  onClear: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [pendingReject, setPendingReject] = useState<PendingReject>(null)

  const count = selectedIds.length
  const noun = `${count} candidate${count === 1 ? '' : 's'}`

  function run(action: BulkStageAction, reason?: RejectionReason, customReason?: string) {
    startTransition(async () => {
      try {
        const result = await bulkStageAction(selectedIds, action, reason, customReason)

        if (result.moved === 0 && result.skipped.length > 0) {
          toast.error('Nothing was changed.', {
            description: result.skipped
              .map((s) => `${s.name} — ${s.reason}`)
              .slice(0, 4)
              .join('\n'),
          })
        } else {
          const verb = action === 'ADVANCE' ? 'advanced' : 'rejected'
          toast.success(`${result.moved} candidate${result.moved === 1 ? '' : 's'} ${verb}.`, {
            // Says exactly who was left behind, rather than letting a partial
            // success read as a complete one.
            description: result.skipped.length
              ? `Skipped ${result.skipped.length}: ${result.skipped
                  .map((s) => `${s.name} (${s.reason})`)
                  .slice(0, 3)
                  .join(', ')}${result.skipped.length > 3 ? '…' : ''}`
              : undefined,
          })
        }

        onClear()
        router.refresh()
      } catch {
        toast.error("Couldn't apply that to the selected candidates.")
      }
    })
  }

  if (count === 0) return null

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-elevated px-3 py-2 shadow-xs">
        <span className="text-sm font-medium">{noun} selected</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={pending}>
              {pending ? 'Working…' : 'Actions'}
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-60">
            <DropdownMenuItem onSelect={() => run('ADVANCE')}>
              <ChevronRight />
              Advance to next stage
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setPendingReject('REJECT')}
            >
              <UserMinus />
              Reject {noun}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => setPendingReject('REJECT_TO_TALENT_POOL')}
            >
              <Users />
              Reject and move to Talent Pool
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClear} disabled={pending}>
          <X />
          Clear
        </Button>

        <p className="text-xs text-muted-foreground">
          Applies to each candidate&rsquo;s current application.
        </p>
      </div>

      <BulkRejectDialog
        open={pendingReject !== null}
        count={count}
        toTalentPool={pendingReject === 'REJECT_TO_TALENT_POOL'}
        pending={pending}
        onCancel={() => setPendingReject(null)}
        onConfirm={(reason, customReason) => {
          const action = pendingReject
          setPendingReject(null)
          if (action) run(action, reason, customReason)
        }}
      />
    </>
  )
}
