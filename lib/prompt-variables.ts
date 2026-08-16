// Pure string parsing — no server-only APIs — so the editor can show
// detected variables live as the user types, not just after a save.
const VARIABLE_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function extractPromptVariables(content: string): string[] {
  const found = new Set<string>()
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    found.add(match[1])
  }
  return [...found].sort()
}
