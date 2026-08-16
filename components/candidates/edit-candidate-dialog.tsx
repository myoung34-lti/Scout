'use client'

import { useActionState, useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateCandidateProfile } from '@/lib/actions/candidates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Candidate = {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  currentCompany: string | null
  location: string | null
}

export function EditCandidateDialog({ candidate }: { candidate: Candidate }) {
  const [open, setOpen] = useState(false)
  const boundAction = updateCandidateProfile.bind(null, candidate.id)
  const [state, formAction, pending] = useActionState(
    async (
      prevState: { errors?: Record<string, string[] | undefined>; success?: true } | undefined,
      formData: FormData
    ) => {
      const result = await boundAction(prevState, formData)
      if (result?.success) setOpen(false)
      return result
    },
    undefined
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil />
          Edit Candidate
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit candidate</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-firstName">First name</Label>
              <Input
                id="edit-firstName"
                name="firstName"
                defaultValue={candidate.firstName}
                required
              />
              {state?.errors?.firstName && (
                <p className="text-sm text-destructive">
                  {state.errors.firstName[0]}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-lastName">Last name</Label>
              <Input
                id="edit-lastName"
                name="lastName"
                defaultValue={candidate.lastName}
                required
              />
              {state?.errors?.lastName && (
                <p className="text-sm text-destructive">
                  {state.errors.lastName[0]}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                name="email"
                type="email"
                defaultValue={candidate.email ?? ''}
              />
              {state?.errors?.email && (
                <p className="text-sm text-destructive">{state.errors.email[0]}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                name="phone"
                defaultValue={candidate.phone ?? ''}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-currentCompany">Current company</Label>
              <Input
                id="edit-currentCompany"
                name="currentCompany"
                defaultValue={candidate.currentCompany ?? ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                name="location"
                defaultValue={candidate.location ?? ''}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-linkedinUrl">LinkedIn URL</Label>
            <Input
              id="edit-linkedinUrl"
              name="linkedinUrl"
              type="url"
              defaultValue={candidate.linkedinUrl ?? ''}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
