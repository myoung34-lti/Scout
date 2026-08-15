'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateUserName } from '@/lib/actions/users'
import { Input } from '@/components/ui/input'

export function UserNameInput({
  userId,
  initialName,
}: {
  userId: string
  initialName: string
}) {
  const [name, setName] = useState(initialName)
  const [pending, startTransition] = useTransition()

  function handleBlur() {
    const trimmed = name.trim()
    if (!trimmed) {
      setName(initialName)
      return
    }
    if (trimmed === initialName) return

    startTransition(async () => {
      try {
        await updateUserName(userId, trimmed)
      } catch {
        setName(initialName)
        toast.error('Failed to update name. Please try again.')
      }
    })
  }

  return (
    <Input
      value={name}
      onChange={(e) => setName(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      disabled={pending}
      className="h-8 max-w-48 border-transparent bg-transparent px-2 font-medium hover:border-input focus-visible:border-input"
    />
  )
}
