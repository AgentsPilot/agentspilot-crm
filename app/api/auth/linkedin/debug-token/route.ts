import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { access_token } = await req.json()
  if (!access_token) return NextResponse.json({ error: 'access_token required' }, { status: 400 })

  const introspectRes = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token:         access_token,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  const raw = await introspectRes.json()
  return NextResponse.json({ status: introspectRes.status, raw })
}
