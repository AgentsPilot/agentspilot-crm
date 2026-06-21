import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    const desc = searchParams.get('error_description') ?? error ?? 'unknown'
    console.error('LinkedIn OAuth error:', error, desc)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=${encodeURIComponent(desc)}`
    )
  }

  // ── Exchange code for access token ────────────────────────────────────────
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    }),
  })

  const tokenData = await tokenRes.json()
  console.log('LinkedIn token response:', JSON.stringify(tokenData))

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=linkedin_token_failed`
    )
  }

  // ── Resolve member URN via /v2/userinfo (requires openid scope) ──────────
  let platformUserId: string | null = null
  let platformUsername = 'LinkedIn'

  try {
    const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    console.log('LinkedIn /v2/userinfo status:', uiRes.status)
    if (uiRes.ok) {
      const ui = await uiRes.json()
      console.log('LinkedIn /v2/userinfo body:', JSON.stringify(ui))
      if (ui.sub) {
        platformUserId   = `urn:li:person:${ui.sub}`
        platformUsername = (ui.name ?? [ui.given_name, ui.family_name].filter(Boolean).join(' ')) || 'LinkedIn'
      }
    } else {
      const body = await uiRes.text()
      console.warn('LinkedIn /v2/userinfo error body:', body)
    }
  } catch (err) {
    console.error('Failed to fetch LinkedIn /v2/userinfo:', err)
  }

  // ── Persist connection ─────────────────────────────────────────────────────
  const { error: dbError } = await supabase.from('social_connections').upsert(
    {
      platform:          'linkedin',
      access_token:      tokenData.access_token,
      expires_at:        new Date(Date.now() + (tokenData.expires_in ?? 5184000) * 1000).toISOString(),
      platform_user_id:  platformUserId,
      platform_username: platformUsername,
      updated_at:        new Date().toISOString(),
    },
    { onConflict: 'platform' }
  )

  if (dbError) {
    console.error('DB error saving LinkedIn connection:', dbError)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=db_error`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/social?connected=linkedin`
  )
}
