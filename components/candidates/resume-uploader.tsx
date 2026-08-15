'use client'

import { useActionState, useRef } from 'react'
import { uploadResumeAction } from '@/lib/actions/resumes'
import { FileInput } from '@/components/ui/file-input'

export function ResumeUploader({ candidateId }: { candidateId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState(
    async (prevState: { error?: string } | undefined, formData: FormData) => {
      const result = await uploadResumeAction(prevState, formData)
      if (!result?.error) {
        formRef.current?.reset()
      }
      return result
    },
    undefined
  )

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-2"
      onChange={(e) => {
        if ((e.target as unknown as HTMLInputElement).name === 'file') {
          formRef.current?.requestSubmit()
        }
      }}
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <FileInput name="file" accept=".pdf,.doc,.docx" required multiple />
      {pending && <p className="text-sm text-muted-foreground">Uploading…</p>}
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
    </form>
  )
}
