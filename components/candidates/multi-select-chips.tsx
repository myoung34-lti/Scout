'use client'

import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function MultiSelectChips({
  options,
  values,
  onChange,
  placeholder,
  showSelected = true,
}: {
  options: { value: string; label: string }[]
  values: string[]
  onChange: (values: string[]) => void
  placeholder: string
  showSelected?: boolean
}) {
  const available = options.filter((o) => !values.includes(o.value))

  return (
    <div className="space-y-2">
      {showSelected && values.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {values.map((v) => {
            const label = options.find((o) => o.value === v)?.label ?? v
            return (
              <Badge key={v} variant="secondary" className="gap-1 pr-1">
                {label}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((x) => x !== v))}
                  className="rounded-full hover:bg-muted"
                  aria-label={`Remove ${label}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {available.length > 0 && (
        <Select
          key={values.length}
          onValueChange={(v) => onChange([...values, v])}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {available.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
