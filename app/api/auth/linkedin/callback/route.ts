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

  // ── Resolve member URN via /v2/me ─────────────────────────────────────────
  // w_member_social is enough to call /v2/me and get the numeric member id.
  let platformUserId: string | null = null
  let platformUsername = 'LinkedIn'

  try {
    const meRes = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    })
    console.log('LinkedIn /v2/me status:', meRes.status)
    if (meRes.ok) {
      const me = await meRes.json()
      console.log('LinkedIn /v2/me body:', JSON.stringify(me))
      if (me.id) {
        platformUserId = `urn:li:person:${me.id}`
        const first = me.localizedFirstName ?? ''
        const last  = me.localizedLastName  ?? ''
        platformUsername = `${first} ${last}`.trim() || 'LinkedIn'
      }
    } else {
      const body = await meRes.text()
      console.warn('LinkedIn /v2/me error body:', body)
    }
  } catch (err) {
    console.error('Failed to fetch LinkedIn /v2/me:', err)
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
