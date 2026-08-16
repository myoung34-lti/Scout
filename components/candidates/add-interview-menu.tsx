'use client'

import { useTransition } from 'react'
import { Plus } from 'lucide-react'
import { createInterview } from '@/lib/actions/interviews'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ALL_INTERVIEW_TYPES, INTERVIEW_TYPE_LABELS } from '@/lib/interview'
import type { InterviewType } from '@prisma/client'

export function AddInterviewMenu({ candidateId }: { candidateId: string }) {
  const [pending, startTransition] = useTransition()

  function handleSelect(type: InterviewType) {
    startTransition(() => createInterview(candidateId, type))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending}>
          <Plus />
          Add Interview
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {ALL_INTERVIEW_TYPES.map((type) => (
          <DropdownMenuItem key={type} onSelect={() => handleSelect(type)}>
            {INTERVIEW_TYPE_LABELS[type]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
