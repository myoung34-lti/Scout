import { FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ResumeUploader } from '@/components/candidates/resume-uploader'

export function ResumePanel({
  candidateId,
  resume,
}: {
  candidateId: string
  resume: { id: string; fileName: string } | null
}) {
  if (!resume) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
        <FileText className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          No resume on file for this candidate.
        </p>
        <ResumeUploader candidateId={candidateId} />
      </div>
    )
  }

  const url = `/api/resumes/${resume.id}`
  const isPdf = resume.fileName.toLowerCase().endsWith('.pdf')

  return (
    <div className="flex h-full flex-col rounded-lg border bg-background">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <span className="truncate text-sm font-medium">{resume.fileName}</span>
        <Button variant="outline" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            Open Resume
            <ExternalLink className="size-3.5" />
          </a>
        </Button>
      </div>
      {isPdf ? (
        <iframe src={url} title="Resume" className="min-h-[70vh] w-full flex-1" />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preview isn&apos;t available for this file type — open it in a new
            tab to view it.
          </p>
        </div>
      )}
    </div>
  )
}
