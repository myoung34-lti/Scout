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

// Native checkboxes sharing one name — FormData.getAll picks up every
// checked value, so a job can carry several of each without extra state.
function AssigneeGroup({
  name,
  label,
  users,
  selected,
}: {
  name: string
  label: string
  users: { id: string; name: string }[]
  selected: string[]
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users to assign.</p>
      ) : (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {users.map((u) => (
            <label key={u.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={name}
                value={u.id}
                defaultChecked={selected.includes(u.id)}
                className="size-4 accent-primary"
              />
              {u.name}
            </label>
          ))}
        </div>
      )}
    </fieldset>
  )
}

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
  users = [],
  assignments = [],
  submitLabel = 'Save job',
}: {
  action: JobFormAction
  defaultValues?: Partial<Job>
  locations?: string[]
  users?: { id: string; name: string }[]
  assignments?: { userId: string; role: 'RECRUITER' | 'SOURCER' }[]
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
          <Label htmlFor="clientName">Client name</Label>
          <Input
            id="clientName"
            name="clientName"
            defaultValue={defaultValues?.clientName ?? undefined}
          />
          {state?.errors?.clientName && (
            <p className="text-sm text-destructive">
              {state.errors.clientName[0]}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamName">Team name</Label>
          <Input
            id="teamName"
            name="teamName"
            defaultValue={defaultValues?.teamName ?? undefined}
          />
          {state?.errors?.teamName && (
            <p className="text-sm text-destructive">
              {state.errors.teamName[0]}
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
                name="isOnsite"
                defaultChecked={defaultValues?.isOnsite}
              />
              Onsite
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="isHybrid"
                defaultChecked={defaultValues?.isHybrid}
              />
              Hybrid
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                name="isRemote"
                defaultChecked={defaultValues?.isRemote}
              />
              Remote
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

        <AssigneeGroup
          name="recruiterIds"
          label="Recruiters"
          users={users}
          selected={assignments.filter((a) => a.role === 'RECRUITER').map((a) => a.userId)}
        />

        <AssigneeGroup
          name="sourcerIds"
          label="Sourcers"
          users={users}
          selected={assignments.filter((a) => a.role === 'SOURCER').map((a) => a.userId)}
        />
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
