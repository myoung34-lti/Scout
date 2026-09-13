import { getAllBoardApplications } from '@/lib/actions/pipeline'
import { requireSession } from '@/lib/session'
import { getComposeEmailGlobals } from '@/lib/actions/compose-email-context'
import { MasterPipelineView } from '@/components/kanban/master-pipeline-view'

export const metadata = { title: 'Pipeline' }

export default async function PipelinePage() {
  const [user, applications, composeGlobals] = await Promise.all([
    requireSession(),
    getAllBoardApplications(),
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
        currentUserId={user.id}
        recruiterName={composeGlobals.recruiterName}
        recruiterEmail={composeGlobals.recruiterEmail}
        staticVariables={composeGlobals.staticVariables}
        emailTemplates={composeGlobals.emailTemplates}
      />
    </div>
  )
}
