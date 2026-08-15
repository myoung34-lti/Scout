# Backlog

Deferred feature ideas, not yet scheduled into the build order.

## Unscheduled

### Resume parsing

Extract structured fields (name, email, phone, title, company, skills, work history) from uploaded resumes and use them to pre-fill the candidate form for review before saving.

- **Approach**: extract text from the PDF/DOCX, send it to Claude with a prompt to return structured JSON, show a "review extracted fields" step in the UI before the candidate is saved.
- **Why this over a dedicated resume-parsing API** (Affinda, Sovren, etc.): avoids adding a new paid vendor, handles messy/inconsistent resume formats well.
- **Cost**: requires an Anthropic API key with its own small per-parse cost (roughly a fraction of a cent to a few cents per resume) — separate from Claude Code session usage.
- **Effort**: moderate — comparable in scope to the resume upload feature (text extraction, extraction prompt, review UI).
- **Open question**: whether the user has/wants to provision an Anthropic API key for this.

## V1.2

### Dedicated interview screen

A focused view for running/recording an interview, distinct from the general candidate profile page.

### Skills section on candidates

A `skills` field/section on the candidate profile, generated from resume parsing. Meant to eventually be a searchable field in the candidate search tools (alongside stage, job, rating, location, and tags).

- Depends on the resume parsing item (Unscheduled) actually extracting a skills list.
- Once it exists, add it as a filter in the candidate search tools alongside the existing Stage/Job/Candidate filter groups.

## V2.0

### Fireflies transcript parser

Parse a pasted/uploaded Fireflies transcript into a specified format per interview stage (e.g. Behavioral Interview vs. Technical Interview each get their own extraction template), rather than dropping the raw transcript into a free-text activity note.

- Builds on the interview-type-tagged activity notes already in place (each note can carry a `stage`).
- Likely needs the same Claude-based extraction approach as resume parsing — same cost/API-key considerations apply.
- Depends on the V1.2 dedicated interview screen existing first, as the natural place to parse into.

## V2.1

### Fuzzy search

Make the "Search candidates" text search typo-tolerant (e.g. "Jordn" still matches "Jordan") instead of the current exact-substring match.

- Current search uses Postgres `contains`/`insensitive` matching — no tolerance for misspellings or partial/transposed characters.
- Options to evaluate: Postgres trigram similarity (`pg_trgm`), a small fuzzy-matching library, or an external search service — trigram is the lightest lift since it stays in Postgres.

### Search all text on profile

Expand the candidate text search to cover the full profile, not just name/email/notes — current title, current company, location, tags, job/application info, and resume text once resume parsing exists.

- Depends in part on the resume parsing item (Unscheduled) for resume text to become searchable at all.
