import { parseGreenhouseJson } from './big-json'

const TOKEN_URL = 'https://auth.greenhouse.io/token'
const API_BASE = 'https://harvest.greenhouse.io/v3/'

let cachedToken: { accessToken: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.accessToken
  }

  const clientId = process.env.GREENHOUSE_CLIENT_ID
  const clientSecret = process.env.GREENHOUSE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GREENHOUSE_CLIENT_ID / GREENHOUSE_CLIENT_SECRET must be set in .env')
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Greenhouse token request failed: ${res.status} ${text}`)

  const data = JSON.parse(text) as { access_token: string; expires_in: number }
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return cachedToken.accessToken
}

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
  return match ? match[1] : null
}

// The one function allowed to make an HTTP call to Greenhouse in this whole
// migration. It hard-fails on anything but GET — the read-only guarantee is
// enforced in code, not just by convention.
async function greenhouseGet(url: string): Promise<{ data: unknown; linkHeader: string | null }> {
  const token = await getAccessToken()
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Greenhouse GET ${url} failed: ${res.status} ${text}`)
  return { data: parseGreenhouseJson(text), linkHeader: res.headers.get('link') }
}

export async function fetchOne(path: string): Promise<unknown> {
  const { data } = await greenhouseGet(`${API_BASE}${path}`)
  return data
}

export async function fetchAll(path: string): Promise<unknown[]> {
  const all: unknown[] = []
  let url: string | null = `${API_BASE}${path}`
  while (url) {
    const { data, linkHeader } = await greenhouseGet(url)
    if (!Array.isArray(data)) {
      throw new Error(`Expected array response from ${url}, got ${typeof data}`)
    }
    all.push(...data)
    url = parseNextLink(linkHeader)
  }
  return all
}
