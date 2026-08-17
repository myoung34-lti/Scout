import JSONBig from 'json-bigint'

// Native JSON.parse converts every number through IEEE-754 float, silently
// rounding integers past 2^53 — Greenhouse IDs are well within that range
// today, but we don't want correctness to depend on that staying true.
// json-bigint parses EVERY integer as native bigint (alwaysParseAsBig),
// so ALL numeric fields come out bigint uniformly — no ambiguity about
// which fields are "big enough" to need it. Call Number(x) explicitly at
// call sites that genuinely want a small plain number (e.g. per_page).
const parser = JSONBig({ useNativeBigInt: true, alwaysParseAsBig: true })

export function parseGreenhouseJson(text: string): unknown {
  return parser.parse(text)
}
