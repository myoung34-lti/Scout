import { google } from 'googleapis'

function getOAuth2Client() {
  return new google.auth.OAuth2({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  })
}

// Refresh tokens don't expire on their own use — only a fresh access token
// is needed per send, minted from the stored refresh token each time rather
// than caching (sends are infrequent enough that the extra round trip
// doesn't matter, and it avoids any expiry-tracking state).
export async function getFreshAccessToken(refreshToken: string): Promise<string> {
  const client = getOAuth2Client()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  if (!credentials.access_token) {
    throw new Error('Failed to refresh Google access token.')
  }
  return credentials.access_token
}

// Crude but sufficient for our own Tiptap-generated HTML (p/br/strong/em/ul/li/a/ol
// only) — spam filters want a text/plain alternative, they don't need a faithful one.
function htmlToPlainText(html: string): string {
  return html
    .replace(/<(p|div|li)[^>]*>/gi, '')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function encodeMimeMessage({
  fromName,
  from,
  to,
  subject,
  html,
}: {
  fromName: string
  from: string
  to: string
  subject: string
  html: string
}): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const text = htmlToPlainText(html)

  const message = [
    `From: "${fromName.replace(/"/g, '')}" <${from}>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
  ].join('\r\n')

  // Gmail's `raw` field is standard base64 with URL-safe substitutions and
  // no padding, not plain base64.
  return Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// Reads the user's own "Send mail as" signature straight from Gmail (needs
// the gmail.settings.basic scope) rather than keeping a separate Scout-owned
// copy that could drift out of sync with whatever they actually have set.
export async function getGmailSignature(accessToken: string, email: string): Promise<string> {
  const client = getOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: 'v1', auth: client })

  const { data } = await gmail.users.settings.sendAs.get({
    userId: 'me',
    sendAsEmail: email,
  })
  // Temporary diagnostic — Gmail's newer multi-signature UI (Settings >
  // General > Signatures, with a per-situation default) doesn't always sync
  // back into this legacy per-alias field, so this tells us definitively
  // whether the API call itself is what's coming back empty.
  console.log('getGmailSignature: sendAs.get result', {
    sendAsEmail: data.sendAsEmail,
    isPrimary: data.isPrimary,
    isDefault: data.isDefault,
    signatureLength: data.signature?.length ?? 0,
  })
  return data.signature ?? ''
}

// Sends via the Gmail API as the authenticated user — lands in their own
// Sent folder for free, since it genuinely is their mailbox sending it.
export async function sendGmailMessage({
  accessToken,
  fromEmail,
  fromName,
  to,
  subject,
  html,
}: {
  accessToken: string
  fromEmail: string
  fromName: string
  to: string
  subject: string
  html: string
}): Promise<void> {
  const client = getOAuth2Client()
  client.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: 'v1', auth: client })

  const raw = encodeMimeMessage({ fromName, from: fromEmail, to, subject, html })
  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  })
}
