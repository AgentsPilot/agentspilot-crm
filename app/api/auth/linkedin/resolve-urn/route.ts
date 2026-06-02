import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { access_token } = await req.json()
  if (!access_token) return NextResponse.json({ error: 'access_token required' }, { status: 400 })

  // ── Try token introspection (uses app credentials — no extra scope needed) ─
  const introspectRes = await fetch('https://www.linkedin.com/oauth/v2/introspectToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      token:         access_token,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  if (introspectRes.ok) {
    const data = await introspectRes.json()
    console.log('LinkedIn introspect:', JSON.stringify(data))
    if (data.sub) {
      return NextResponse.json({ memberId: data.sub, name: 'LinkedIn' })
    }
    if (data.auth_type === 'member' && data.client_id) {
      // sub missing but token is valid — fall through to userinfo
    }
  } else {
    console.warn('Introspect failed:', introspectRes.status, await introspectRes.text())
  }

  // ── Fallback: /v2/userinfo (needs openid scope) ────────────────────────────
  const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (uiRes.ok) {
    const ui = await uiRes.json()
    if (ui.sub) {
      const name = ui.name
        ?? ([ui.given_name, ui.family_name].filter(Boolean).join(' ') || 'LinkedIn')
      return NextResponse.json({ memberId: ui.sub, name })
    }
  }

  // ── Last resort: ask user to enter member ID manually ─────────────────────
  return NextResponse.json(
    { error: 'MANUAL_ID_REQUIRED' },
    { status: 400 }
  )
}
