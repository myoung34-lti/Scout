'use client'

import { useState, useTransition } from 'react'
import { Copy, Check } from 'lucide-react'
import { getFirefliesPromptForType } from '@/lib/actions/prompts'
import { Button } from '@/components/ui/button'
import type { InterviewType } from '@prisma/client'

export function CopyFirefliesPromptButton({ type }: { type: InterviewType }) {
  const [pending, startTransition] = useTransition()
  const [used, setUsed] = useState<{ name: string; version: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const prompt = await getFirefliesPromptForType(type)
      if (!prompt) {
        setError("This prompt isn't available right now.")
        return
      }
      await navigator.clipboard.writeText(prompt.content)
      setUsed({ name: prompt.name, version: prompt.version })
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending}>
        {used ? <Check /> : <Copy />}
        {pending ? 'Copying…' : 'Copy Current Fireflies Prompt'}
      </Button>
      {used && (
        <span className="text-xs text-muted-foreground">
          Using: {used.name} v{used.version}
        </span>
      )}
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  )
}
