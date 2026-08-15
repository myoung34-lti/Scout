import { NextResponse } from 'next/server'
import { getResumeFile } from '@/lib/actions/resumes'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resumeId: string }> }
) {
  const { resumeId } = await params
  const result = await getResumeFile(resumeId)

  if (!result) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { resume, bytes } = result
  const body = new Uint8Array(bytes)

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `inline; filename="${encodeURIComponent(resume.fileName)}"`,
      'Content-Length': String(resume.fileSize),
    },
  })
}
