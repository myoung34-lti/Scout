import {
  UploadCloud,
  Search,
  Star,
  Activity,
  Mic,
  ArrowRightCircle,
  ScrollText,
  Bookmark,
  Bug,
} from 'lucide-react'
import { BackButton } from '@/components/layout/back-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { LucideIcon } from 'lucide-react'

function GuideSection({
  icon: Icon,
  title,
  intro,
  children,
}: {
  icon: LucideIcon
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Icon className="size-4.5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {intro && <p className="pl-12 text-sm text-muted-foreground">{intro}</p>}
      </CardHeader>
      <CardContent className="pl-[4.25rem]">
        <ul className="list-disc space-y-2 text-sm marker:text-muted-foreground/50">
          {children}
        </ul>
      </CardContent>
    </Card>
  )
}

export default function UserGuidePage() {
  return (
    <div className="space-y-6">
      <div>
        <BackButton className="mb-2" />
        <h1 className="page-title">User Guide</h1>
        <p className="text-sm text-muted-foreground">
          How LTI&apos;s recruiting team uses Scout, day to day, candidate to candidate. Scout
          just went live, so expect rough edges — see Known Issues at the bottom for how to flag
          something.
        </p>
      </div>

      <div className="space-y-4">
        <GuideSection
          icon={UploadCloud}
          title="Add a candidate"
          intro="One upload does most of the work — everything after that is a quick review pass."
        >
          <li>
            Upload their resume. Scout reads it right away and fills in name, email, phone,
            LinkedIn, current company, and location.
          </li>
          <li>
            Skills pulled from the resume become <strong>Tags</strong> automatically — remove any
            that don&apos;t fit before saving.
          </li>
          <li>
            Give the <strong>LinkedIn</strong> field a glance. The scan usually catches it, but
            it&apos;s worth confirming before you move on.
          </li>
          <li>
            Fill in what&apos;s left: recruiter, source, and either a job plus starting stage, or
            check <strong>&quot;No job yet&quot;</strong> to send them straight to the Talent
            Pool instead.
          </li>
          <li>
            <strong>No resume at intake?</strong> You can still get it scanned later — open the
            candidate&apos;s profile, click <strong>Edit</strong>, upload the resume there, check{' '}
            <strong>&quot;Scan this resume to fill in the fields below&quot;</strong>, and save.
            It fills in the same fields as the intake scan.
          </li>
        </GuideSection>

        <GuideSection
          icon={Search}
          title="Find a candidate"
          intro="The Candidates list shows everyone by default — every stage, rejected, hired, pooled, all of it."
        >
          <li>
            Use the <strong>Quick Filters</strong> — Active, Talent Pool, Rated, Rejected — to
            narrow it down fast.
          </li>
          <li>Or filter by Stage, Job, or search directly for a name, for anything more specific.</li>
        </GuideSection>

        <GuideSection
          icon={Star}
          title="Rate a candidate"
          intro="The five-star widget sits next to their name on the candidate profile."
        >
          <li>Click a star to set the rating; click that same star again to clear it.</li>
          <li>
            The same rating shows up on the Candidates list, the Talent Pool list, and the
            interview page — visible wherever you&apos;re scanning names.
          </li>
          <li>Every change is logged to the Activity Feed automatically, no extra step needed.</li>
        </GuideSection>

        <GuideSection
          icon={Activity}
          title="Activity feed"
          intro="Lives on each candidate's profile, and mostly writes itself."
        >
          <li>
            Logged automatically: added to Scout, Talent Pool changes, rating changes, and skills
            pulled in from a resume scan.
          </li>
          <li>Plus anything you add manually — a quick note, a call summary, whatever&apos;s worth remembering.</li>
          <li>
            Interviews land here too, including ones still in progress — an unfinished interview
            shows up as a <strong>Draft</strong> entry you can click straight back into.
          </li>
        </GuideSection>

        <GuideSection
          icon={Mic}
          title="Run an interview"
          intro="Started from inside the candidate's profile, against that specific application."
        >
          <li>Rate the candidate and take notes in the box at the top as you go.</li>
          <li>
            Click <strong>Copy Current Fireflies Prompt</strong> to grab the right prompt for that
            interview type.
          </li>
          <li>
            Paste it into whichever AI notetaking tool your team uses — Fireflies, Ask Fred,
            whatever&apos;s running the call.
          </li>
          <li>
            Paste what comes back into the <strong>Fireflies Summary</strong> box, then add your
            recommendation.
          </li>
          <li>
            <strong>It autosaves as you type</strong> — safe to step away mid-interview. Until you
            click <strong>Complete Interview</strong>, it stays a draft, visible in the Activity
            Feed so nothing gets lost.
          </li>
        </GuideSection>

        <GuideSection
          icon={ArrowRightCircle}
          title="Advance or reject"
          intro="On the candidate's profile, under Applications — separate from the interview page itself."
        >
          <li>Click <strong>Advance</strong> to move them to the next stage.</li>
          <li>Click <strong>Reject</strong> to end that application, and give a reason when prompted.</li>
        </GuideSection>

        <GuideSection
          icon={ScrollText}
          title="Prompt library"
          intro="Where the prompt behind Copy Current Fireflies Prompt actually lives."
        >
          <li>
            One prompt per interview type, written with <code className="rounded bg-muted px-1 py-0.5 text-xs">{'{{variables}}'}</code> that
            get filled in automatically.
          </li>
          <li>
            Editing never overwrites — every save creates a new version, and old ones stay
            viewable and restorable.
          </li>
          <li>
            Duplicate an existing prompt as a starting point, or mark one inactive without
            deleting it. Only active prompts show up on the interview page.
          </li>
        </GuideSection>

        <GuideSection
          icon={Bookmark}
          title="Talent pool"
          intro="Not 'no active job' — it's its own flag, independent of any application."
        >
          <li>A candidate can be in the Talent Pool and have a live application at the same time.</li>
          <li>Add someone during intake with <strong>&quot;No job yet&quot;</strong>, or anytime from their profile.</li>
          <li>
            The Talent Pool list still shows their existing applications and lets you add them to
            a new job directly from there.
          </li>
        </GuideSection>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Bug className="size-4.5 text-primary" />
              </div>
              <CardTitle className="text-lg">Known issues &amp; feedback</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pl-[4.25rem] text-sm">
            <p>Scout was just built, so expect rough edges.</p>
            <p>
              Found something broken?{' '}
              <a
                href="https://docs.google.com/document/d/1Qg340MRXX2kObTyWshe7uX0UmbrNr99XaS_BUSjbZvY/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Log it in the bug tracker
              </a>
              .
            </p>
            <p>
              Have an idea for what Scout should do next?{' '}
              <a
                href="https://docs.google.com/document/d/1VmRmv80DRPO9I1CwqzlU-yoENGT3mBV3HDP_XUwKjC0/edit?tab=t.0"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline underline-offset-2"
              >
                Add it to Future Build Items
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
