'use client'

import { useState, useTransition } from 'react'
import { updatePromptKey } from '@/lib/actions/prompts'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function EditKeyDialog({ promptId, currentKey }: { promptId: string; currentKey: string }) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState(currentKey)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave() {
    setError(null)
    startTransition(async () => {
      const result = await updatePromptKey(promptId, key)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setKey(currentKey)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="h-auto px-0 text-xs">
          Edit key (advanced)
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change the stable key</DialogTitle>
          <DialogDescription>
            Code refers to this prompt by its key, not its name. Changing it will break any
            existing code that looks up <code className="font-mono">{currentKey}</code> — only do
            this if you&apos;re updating those references too.
          </DialogDescription>
        </DialogHeader>

        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="font-mono text-sm"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter className="mt-2 gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={pending || key.trim() === ''}>
            {pending ? 'Saving…' : 'Save Key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
