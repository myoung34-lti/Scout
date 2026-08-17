'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Job } from '@prisma/client'

type JobFormState = {
  errors?: Record<string, string[] | undefined>
}

type JobFormAction = (
  prevState: JobFormState | undefined,
  formData: FormData
) => Promise<JobFormState | undefined>

export function JobForm({
  action,
  defaultValues,
  locations = [],
  submitLabel = 'Save job',
}: {
  action: JobFormAction
  defaultValues?: Partial<Job>
  locations?: string[]
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="internalName">Internal name</Label>
          <Input
            id="internalName"
            name="internalName"
            defaultValue={defaultValues?.internalName}
            required
          />
          {state?.errors?.internalName && (
            <p className="text-sm text-destructive">
              {state.errors.internalName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="externalName">External name</Label>
          <Input
            id="externalName"
            name="externalName"
            defaultValue={defaultValues?.externalName}
            required
          />
          {state?.errors?.externalName && (
            <p className="text-sm text-destructive">
              {state.errors.externalName[0]}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            name="location"
            list="location-options"
            defaultValue={defaultValues?.location}
            autoComplete="off"
            required
          />
          <datalist id="location-options">
            {locations.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
          {state?.errors?.location && (
            <p className="text-sm text-destructive">
              {state.errors.location[0]}
            </p>
          )}
          <div className="flex items-center gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="isRemote"
                defaultChecked={defaultValues?.isRemote}
              />
              Remote
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="isHybrid"
                defaultChecked={defaultValues?.isHybrid}
              />
              Hybrid
            </label>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select name="status" defaultValue={defaultValues?.status ?? 'OPEN'}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="ON_HOLD">On hold</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={12}
          className="field-sizing-fixed resize-none overflow-y-auto"
          defaultValue={defaultValues?.description ?? undefined}
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
