'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'
import { updateEmailVariable, deleteEmailVariable } from '@/lib/actions/email-variables'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TableCell, TableRow } from '@/components/ui/table'
import type { EmailVariable } from '@prisma/client'

export function EmailVariableRow({ variable }: { variable: EmailVariable }) {
  const [label, setLabel] = useState(variable.label)
  const [value, setValue] = useState(variable.value)
  const [pending, startTransition] = useTransition()
  const [deleting, startDeleting] = useTransition()

  function handleBlur() {
    if (label === variable.label && value === variable.value) return
    if (!label.trim() || !value.trim()) {
      setLabel(variable.label)
      setValue(variable.value)
      return
    }

    startTransition(async () => {
      const result = await updateEmailVariable(variable.id, { label, value })
      if ('error' in result) {
        setLabel(variable.label)
        setValue(variable.value)
        toast.error(result.error)
      }
    })
  }

  function handleDelete() {
    if (!window.confirm(`Delete the "{{${variable.key}}}" variable?`)) return
    startDeleting(() => deleteEmailVariable(variable.id))
  }

  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline" className="font-mono">
          {`{{${variable.key}}}`}
        </Badge>
      </TableCell>
      <TableCell>
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onBlur={handleBlur}
          disabled={pending || deleting}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          disabled={pending || deleting}
          className="h-8"
        />
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Delete variable"
        >
          <Trash2 className="text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
