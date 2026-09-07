'use client'

import { useState } from 'react'
import { Mail, MoreHorizontal, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useComposeEmail } from '@/components/candidates/compose-email-provider'
import { EditCandidateDialog } from '@/components/candidates/edit-candidate-dialog'
import type { ComponentProps } from 'react'

type EditProps = ComponentProps<typeof EditCandidateDialog>

export function CandidateHeaderActions({
  candidate,
  users,
  hasEmail,
}: {
  candidate: EditProps['candidate']
  users: EditProps['users']
  hasEmail: boolean
}) {
  const { openComposeEmail } = useComposeEmail()
  const [editOpen, setEditOpen] = useState(false)

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="More candidate actions">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            Edit candidate
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button onClick={() => openComposeEmail()} disabled={!hasEmail} title={hasEmail ? undefined : 'This candidate has no email address'}>
        <Mail />
        Compose Email
      </Button>

      <EditCandidateDialog
        candidate={candidate}
        users={users}
        open={editOpen}
        onOpenChange={setEditOpen}
        showTrigger={false}
      />
    </div>
  )
}
