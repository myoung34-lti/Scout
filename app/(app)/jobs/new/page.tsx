import { createJob, listDistinctLocations } from '@/lib/actions/jobs'
import { listUsers } from '@/lib/actions/users'
import { JobForm } from '@/components/jobs/job-form'

export default async function NewJobPage() {
  const [locations, users] = await Promise.all([listDistinctLocations(), listUsers()])

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="page-title">Add Job</h1>
      <JobForm action={createJob} submitLabel="Create job" locations={locations} users={users} />
    </div>
  )
}
