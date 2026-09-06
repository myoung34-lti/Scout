// Real interpolation for email templates — lib/prompt-variables.ts only
// detects {{x}} tokens for display in the editor; nothing there actually
// substitutes them. This is that missing piece. Callers merge the fixed
// dynamic variables (lib/email-variables.ts) with the admin-managed static
// ones into a single flat map before rendering.
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

// Unknown tokens are left untouched rather than blanked — a typo'd
// variable name should be obviously wrong when reviewed, not silently
// disappear from the email.
export function renderEmailTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(VARIABLE_PATTERN, (match, key: string) =>
    key in vars ? vars[key] : match
  )
}
