import { getAllBoardApplications, getMyRecruiterJobIds } from '@/lib/actions/pipeline'
import { getComposeEmailGlobals } from '@/lib/actions/compose-email-context'
import { MasterPipelineView } from '@/components/kanban/master-pipeline-view'

export const metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  const [applications, myJobIds, composeGlobals] = await Promise.all([
    getAllBoardApplications(),
    getMyRecruiterJobIds(),
    getComposeEmailGlobals(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Every candidate in process across all open and on-hold positions.
        </p>
      </div>
      <MasterPipelineView
        applications={applications}
        myJobIds={myJobIds}
        recruiterName={composeGlobals.recruiterName}
        recruiterEmail={composeGlobals.recruiterEmail}
        staticVariables={composeGlobals.staticVariables}
        emailTemplates={composeGlobals.emailTemplates}
      />
    </div>
  )
}
