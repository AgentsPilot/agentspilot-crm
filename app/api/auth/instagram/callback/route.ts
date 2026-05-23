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
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`,
      code,
    })
  )
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=instagram_token_failed`
    )
  }

  const userToken = tokenData.access_token

  // ── Find the Instagram Business Account linked to the user's Facebook Page ─
  // Flow: user token → list FB pages → each page may have instagram_business_account
  let igAccountId:  string | null = null
  let igUsername  = 'Instagram'
  let pageToken:    string | null = null

  try {
    const pagesRes  = await fetch(`${GRAPH}/me/accounts?access_token=${userToken}`)
    const pagesData = await pagesRes.json()
    console.log('IG — Facebook pages:', JSON.stringify(pagesData))

    if (pagesData.data) {
      for (const page of pagesData.data) {
        pageToken = page.access_token
        // Check if this page has a linked IG business account
        const igRes  = await fetch(
          `${GRAPH}/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
        )
        const igData = await igRes.json()
        if (igData.instagram_business_account?.id) {
          igAccountId = igData.instagram_business_account.id
          // Get the IG username
          const igInfoRes  = await fetch(
            `${GRAPH}/${igAccountId}?fields=username&access_token=${page.access_token}`
          )
          const igInfo = await igInfoRes.json()
          igUsername = igInfo.username ? `@${igInfo.username}` : 'Instagram'
          console.log('IG account found:', igAccountId, igUsername)
          break
        }
      }
    }
  } catch (err) {
    console.error('Failed to find Instagram account:', err)
  }

  if (!igAccountId) {
    // No IG business account found — redirect with helpful error
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=${encodeURIComponent(
        'No Instagram Business account linked to your Facebook Page. Connect an Instagram Business/Creator account to your Facebook Page first.'
      )}`
    )
  }

  // ── Persist connection ─────────────────────────────────────────────────────
  const { error: dbError } = await supabase.from('social_connections').upsert(
    {
      platform:          'instagram',
      access_token:      pageToken ?? userToken,
      platform_user_id:  igAccountId,
      platform_username: igUsername,
      page_id:           igAccountId,
      page_access_token: pageToken,
      expires_at:        null,
      updated_at:        new Date().toISOString(),
    },
    { onConflict: 'platform' }
  )

  if (dbError) {
    console.error('DB error saving Instagram connection:', dbError)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/social?error=db_error`
    )
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL}/social?connected=instagram`
  )
}
