import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const TIKTOK_TOKEN_URL = 'https://open.tiktok.com/v2/oauth/token/'
const TIKTOK_USER_URL  = 'https://open.tiktok.com/v2/user/info/'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    const desc = searchParams.get('error_description') ?? error ?? 'unknown'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=${encodeURIComponent(desc)}`
    )
  }

  // ── Exchange code for access token ────────────────────────────────────────
  const tokenRes = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key:    process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      code,
      grant_type:    'authorization_code',
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`,
    }),
  })

  const tokenData = await tokenRes.json()

  if (tokenData.error || !tokenData.data?.access_token) {
    const msg = tokenData.error_description ?? tokenData.error ?? 'token_failed'
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=${encodeURIComponent(`TikTok: ${msg}`)}`
    )
  }

  const { access_token, refresh_token, expires_in, open_id } = tokenData.data

  // ── Fetch user profile ────────────────────────────────────────────────────
  let username = 'TikTok'
  try {
    const userRes = await fetch(
      `${TIKTOK_USER_URL}?fields=open_id,union_id,avatar_url,display_name`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    )
    const userData = await userRes.json()
    if (userData.data?.user?.display_name) {
      username = `@${userData.data.user.display_name}`
    }
  } catch {
    // non-fatal — we still have the token
  }

  // ── Calculate expiry ──────────────────────────────────────────────────────
  const expiresAt = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null

  // ── Persist connection ────────────────────────────────────────────────────
  const { error: dbError } = await supabase.from('social_connections').upsert(
    {
      platform:           'tiktok',
      access_token,
      refresh_token:      refresh_token ?? null,
      platform_user_id:   open_id,
      platform_username:  username,
      expires_at:         expiresAt,
      updated_at:         new Date().toISOString(),
    },
    { onConflict: 'platform' }
  )

  if (dbError) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=db_error`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/social?connected=tiktok`
  )
}
