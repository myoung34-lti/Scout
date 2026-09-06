'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { createEmailVariable } from '@/lib/actions/email-variables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function AddEmailVariableDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [key, setKey] = useState('')
  const [keyTouched, setKeyTouched] = useState(false)
  const [value, setValue] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setLabel('')
    setKey('')
    setKeyTouched(false)
    setValue('')
    setError(null)
  }

  async function handleSubmit() {
    setPending(true)
    setError(null)
    const result = await createEmailVariable({ key, label, value })
    setPending(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setOpen(false)
    reset()
    router.refresh()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus />
          Add Variable
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Static Variable</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="variable-label">Label</Label>
            <Input
              id="variable-label"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value)
                if (!keyTouched) setKey(slugify(e.target.value))
              }}
              placeholder="Company Name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="variable-key">Key</Label>
            <Input
              id="variable-key"
              value={key}
              onChange={(e) => {
                setKeyTouched(true)
                setKey(e.target.value)
              }}
              className="font-mono text-sm"
              placeholder="companyName"
            />
            <p className="text-xs text-muted-foreground">
              Used in templates as {'{{'}
              {key || 'key'}
              {'}}'}.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="variable-value">Value</Label>
            <Input
              id="variable-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Logic Technology Inc."
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending || !label.trim() || !key.trim() || !value.trim()}>
            {pending ? 'Adding…' : 'Add Variable'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
