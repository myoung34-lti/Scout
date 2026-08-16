'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

export function FileInput({
  id,
  name,
  accept,
  required,
  multiple,
  onFilesSelected,
}: {
  id?: string
  name: string
  accept?: string
  required?: boolean
  multiple?: boolean
  onFilesSelected?: (files: File[]) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileNames, setFileNames] = useState<string[]>([])

  return (
    <div className="flex items-start gap-3">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="file"
        accept={accept}
        required={required}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          setFileNames(files.map((f) => f.name))
          onFilesSelected?.(files)
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
      >
        Choose file{multiple ? 's' : ''}
      </Button>
      {fileNames.length > 0 && (
        <span className="truncate text-sm text-muted-foreground">
          {fileNames.join(', ')}
        </span>
      )}
    </div>
  )
}
