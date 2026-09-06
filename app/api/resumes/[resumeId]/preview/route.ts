import { NextResponse } from 'next/server'
import { getResumeFile } from '@/lib/actions/resumes'

// Renders .docx resumes as HTML for in-app preview — browsers can't display
// docx natively the way they can PDF, but mammoth (already used for resume
// text extraction) also converts the document body to HTML.
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
  if (!resume.fileName.toLowerCase().endsWith('.docx')) {
    return new NextResponse('Preview not supported for this file type', { status: 415 })
  }

  const mammoth = (await import('mammoth')).default
  let html: string
  try {
    const converted = await mammoth.convertToHtml({ buffer: bytes })
    html = converted.value
  } catch (err) {
    console.error('docx preview conversion failed for', resume.fileName, err)
    return new NextResponse('Could not render preview', { status: 422 })
  }

  const document = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 780px; margin: 2rem auto; padding: 0 1.5rem; }
  img { max-width: 100%; }
  table { border-collapse: collapse; }
  td, th { border: 1px solid #ddd; padding: 4px 8px; }
</style>
</head>
<body>${html}</body>
</html>`

  return new NextResponse(document, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
