'use client'

import { useActionState, useRef } from 'react'
import { uploadResumeAction } from '@/lib/actions/resumes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
    <form ref={formRef} action={formAction} className="space-y-2">
      <input type="hidden" name="candidateId" value={candidateId} />
      <Input name="file" type="file" accept=".pdf,.doc,.docx" required />
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? 'Uploading…' : 'Upload resume'}
      </Button>
    </form>
  )
}
