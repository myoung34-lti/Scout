'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateUserRole } from '@/lib/actions/users'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ALL_ROLES, ROLE_LABELS } from '@/lib/role'
import type { Role } from '@prisma/client'

export function UserRoleSelect({
  userId,
  initialRole,
}: {
  userId: string
  initialRole: Role
}) {
  const [role, setRole] = useState(initialRole)
  const [pending, startTransition] = useTransition()

  function handleChange(next: string) {
    const previous = role
    const value = next as Role
    setRole(value)

    startTransition(async () => {
      try {
        await updateUserRole(userId, value)
      } catch {
        setRole(previous)
        toast.error('Failed to update role. Please try again.')
      }
    })
  }

  return (
    <Select value={role} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="w-40">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_ROLES.map((r) => (
          <SelectItem key={r} value={r}>
            {ROLE_LABELS[r]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
