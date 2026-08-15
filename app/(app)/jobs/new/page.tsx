import { createJob, listDistinctLocations } from '@/lib/actions/jobs'
import { JobForm } from '@/components/jobs/job-form'

export default async function NewJobPage() {
  const locations = await listDistinctLocations()

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New Job</h1>
      <JobForm action={createJob} submitLabel="Create job" locations={locations} />
    </div>
  )
}
