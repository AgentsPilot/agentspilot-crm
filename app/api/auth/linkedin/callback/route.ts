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

  // ── Resolve member URN ─────────────────────────────────────────────────────
  // Try 1: OpenID Connect /userinfo (needs `openid` scope)
  // Try 2: v2/me (needs `r_liteprofile` or `profile` scope)
  // Either gives us the numeric member ID → urn:li:person:{id}
  let platformUserId: string | null = null
  let platformUsername = 'LinkedIn'

  try {
    // Attempt 1 — OpenID Connect userinfo
    const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (uiRes.ok) {
      const ui = await uiRes.json()
      if (ui.sub) {
        platformUserId = `urn:li:person:${ui.sub}`
        platformUsername =
          ui.name ?? ([ui.given_name, ui.family_name].filter(Boolean).join(' ') || 'LinkedIn')
        console.log('LinkedIn URN via userinfo:', platformUserId)
      }
    } else {
      console.warn('LinkedIn /userinfo status:', uiRes.status, '— trying /v2/me')
      // Attempt 2 — classic v2/me
      const meRes = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'X-Restli-Protocol-Version': '2.0.0',
        },
      })
      if (meRes.ok) {
        const me = await meRes.json()
        if (me.id) {
          platformUserId = `urn:li:person:${me.id}`
          const first = me.localizedFirstName ?? ''
          const last  = me.localizedLastName  ?? ''
          platformUsername = `${first} ${last}`.trim() || 'LinkedIn'
          console.log('LinkedIn URN via /v2/me:', platformUserId)
        }
      } else {
        console.warn('LinkedIn /v2/me status:', meRes.status, '— URN will be null')
      }
    }
  } catch (err) {
    console.error('Failed to fetch LinkedIn profile:', err)
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
