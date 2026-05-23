import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    const desc = searchParams.get('error_description') ?? error ?? 'unknown'
    console.error('LinkedIn OAuth error:', error, desc)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=${encodeURIComponent(desc)}`
    )
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`,
      client_id: process.env.LINKEDIN_CLIENT_ID!,
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

  // Resolve the member's profile to get their person URN
  let platformUserId: string | null = null
  let platformUsername = 'LinkedIn'
  try {
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    if (profileRes.ok) {
      const profile = await profileRes.json()
      // `sub` is the member's numeric ID; construct the URN
      if (profile.sub) {
        platformUserId = `urn:li:person:${profile.sub}`
      }
      if (profile.name) platformUsername = profile.name
      else if (profile.given_name) platformUsername = `${profile.given_name} ${profile.family_name ?? ''}`.trim()
    }
    console.log('LinkedIn profile resolved:', platformUserId, platformUsername)
  } catch (err) {
    console.error('Failed to fetch LinkedIn profile:', err)
  }

  // Store connection
  const { error: dbError } = await supabase.from('social_connections').upsert({
    platform: 'linkedin',
    access_token: tokenData.access_token,
    expires_at: new Date(Date.now() + (tokenData.expires_in ?? 5184000) * 1000).toISOString(),
    platform_user_id: platformUserId,
    platform_username: platformUsername,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'platform' })

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
