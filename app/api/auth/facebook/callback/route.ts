import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const GRAPH = 'https://graph.facebook.com/v19.0'

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

  // ── Exchange code for user access token ───────────────────────────────────
  const tokenRes = await fetch(
    `${GRAPH}/oauth/access_token?` +
    new URLSearchParams({
      client_id:     process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
      code,
    })
  )
  const tokenData = await tokenRes.json()
  console.log('Facebook token response:', JSON.stringify(tokenData))

  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=facebook_token_failed`
    )
  }

  const userToken = tokenData.access_token

  // ── Get the user's Pages (we pick the first one) ──────────────────────────
  // Each page has its own long-lived page access token
  let pageId:          string | null = null
  let pageToken:       string | null = null
  let pageName = 'Facebook Page'

  try {
    const pagesRes = await fetch(
      `${GRAPH}/me/accounts?access_token=${userToken}`
    )
    const pagesData = await pagesRes.json()
    console.log('Facebook pages:', JSON.stringify(pagesData))

    if (pagesData.data && pagesData.data.length > 0) {
      const page = pagesData.data[0]   // first managed page
      pageId    = page.id
      pageToken = page.access_token    // page-scoped, long-lived token
      pageName  = page.name ?? 'Facebook Page'
    }
  } catch (err) {
    console.error('Failed to fetch Facebook pages:', err)
  }

  // ── Persist connection ────────────────────────────────────────────────────
  const { error: dbError } = await supabase.from('social_connections').upsert(
    {
      platform:          'facebook',
      access_token:      pageToken ?? userToken,   // prefer page token for publishing
      platform_user_id:  pageId,
      platform_username: pageName,
      page_id:           pageId,
      page_access_token: pageToken,
      expires_at:        null,                      // page tokens are long-lived
      updated_at:        new Date().toISOString(),
    },
    { onConflict: 'platform' }
  )

  if (dbError) {
    console.error('DB error saving Facebook connection:', dbError)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=db_error`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/social?connected=facebook`
  )
}
