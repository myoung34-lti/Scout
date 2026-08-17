// Greenhouse job_post `content` is one semantic HTML blob (headings,
// paragraphs, lists) — not split into Scout's whoWereLookingFor /
// primaryResponsibilities / mustHaves fields. Rather than guess a split
// from heading text (fragile, varies per posting), this collapses the
// whole thing to clean plain text for Job.description.
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<li[^>]*>/gi, '\n- ')
    .replace(/<\/(p|div|h[1-6])>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim()
}
