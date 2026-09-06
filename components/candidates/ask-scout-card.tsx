'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { askScout } from '@/lib/actions/ai'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import type { AskScoutMessage, User } from '@prisma/client'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const SUGGESTIONS = [
  'What motivates this candidate?',
  'What should I remember before calling them?',
  'What are the main open questions?',
  'What did they say about onsite work?',
  'Draft a check-in email',
]

type MessageWithAsker = AskScoutMessage & { askedBy: User }

// Local-only shape for an in-flight answer not yet confirmed saved to the
// DB — same fields, just no id/askedBy yet.
type HistoryEntry = {
  id: string
  question: string
  answer: string
  askedByName: string
  createdAt: Date
}

export function AskScoutCard({
  candidateId,
  messages,
  currentUserName,
}: {
  candidateId: string
  messages: MessageWithAsker[]
  currentUserName: string
}) {
  const [question, setQuestion] = useState('')
  const [asking, setAsking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>(
    messages.map((m) => ({
      id: m.id,
      question: m.question,
      answer: m.answer,
      askedByName: m.askedBy.name,
      createdAt: m.createdAt,
    }))
  )

  async function handleAsk(q: string) {
    const trimmed = q.trim()
    if (!trimmed || asking) return
    setQuestion(trimmed)
    setAsking(true)
    setError(null)
    const result = await askScout(candidateId, trimmed)
    setAsking(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setHistory((prev) => [
      {
        id: `local-${Date.now()}`,
        question: trimmed,
        answer: result.answer,
        askedByName: currentUserName,
        createdAt: new Date(),
      },
      ...prev,
    ])
    setQuestion('')
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Ask anything about this candidate based on their recruiting history.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <Button
            key={s}
            type="button"
            variant="outline"
            size="sm"
            className="h-auto whitespace-normal text-left"
            onClick={() => handleAsk(s)}
            disabled={asking}
          >
            {s}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <Textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What would you like to know?"
          rows={2}
          className="field-sizing-fixed resize-none"
          disabled={asking}
        />
        <Button
          type="button"
          size="icon"
          onClick={() => handleAsk(question)}
          disabled={asking || !question.trim()}
          aria-label="Ask Scout"
        >
          <Send />
        </Button>
      </div>

      {asking && <p className="text-sm text-muted-foreground">Thinking…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {history.length > 0 && (
        <ul className="space-y-2">
          {history.map((entry) => (
            <li key={entry.id} className="space-y-1 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{entry.question}</p>
                <Badge variant="outline" className="shrink-0 font-normal">
                  {entry.askedByName}
                </Badge>
              </div>
              <p className="text-sm whitespace-pre-wrap">{entry.answer}</p>
              <p className="text-xs text-muted-foreground">
                {dateFormatter.format(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
