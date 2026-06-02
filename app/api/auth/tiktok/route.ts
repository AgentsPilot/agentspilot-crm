import { NextResponse } from 'next/server'

export async function GET() {
  const clientKey  = process.env.TIKTOK_CLIENT_KEY!
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/tiktok/callback`)
  // user.info.basic  → read profile (username, display name)
  // video.publish    → publish videos directly to TikTok
  // video.upload     → upload video files
  const scope = encodeURIComponent('user.info.basic,video.publish,video.upload')
  const csrfState = 'tiktok_connect'

  const url =
    `https://www.tiktok.com/v2/auth/authorize/` +
    `?client_key=${clientKey}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&redirect_uri=${redirectUri}` +
    `&state=${csrfState}`

  return NextResponse.redirect(url)
}
