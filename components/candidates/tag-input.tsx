'use client'

import { useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { addTagToCandidate, removeTagFromCandidate } from '@/lib/actions/tags'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

type TagItem = { tagId: string; label: string }

export function TagInput({
  candidateId,
  tags,
  allTags,
}: {
  candidateId: string
  tags: TagItem[]
  allTags: string[]
}) {
  const [pending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const value = inputRef.current?.value.trim()
    if (!value) return

    startTransition(() => {
      addTagToCandidate(candidateId, value).catch(() => {
        toast.error('Failed to add tag. Please try again.')
      })
    })
    if (inputRef.current) inputRef.current.value = ''
  }

  function handleRemove(tagId: string) {
    startTransition(() => {
      removeTagFromCandidate(candidateId, tagId).catch(() => {
        toast.error('Failed to remove tag. Please try again.')
      })
    })
  }

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.map((t) => (
            <Badge key={t.tagId} variant="outline" className="gap-1 pr-1">
              {t.label}
              <button
                type="button"
                onClick={() => handleRemove(t.tagId)}
                className="rounded-full hover:bg-muted"
                aria-label={`Remove ${t.label}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          ref={inputRef}
          list="tag-options"
          placeholder="Add a tag…"
          className="h-8"
        />
        <datalist id="tag-options">
          {allTags.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          Add
        </Button>
      </form>
    </div>
  )
}
