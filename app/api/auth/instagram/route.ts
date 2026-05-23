import { NextResponse } from 'next/server'

export async function GET() {
  const appId      = process.env.FACEBOOK_APP_ID!   // Instagram uses the same Meta app
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/instagram/callback`)
  // instagram_basic              → read IG account info
  // instagram_content_publish    → create & publish posts
  // pages_show_list              → needed to find linked IG business account
  // pages_read_engagement        → needed by the Graph API for IG publishing
  const scope = encodeURIComponent('instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement')
  const url = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=ig_connect`
  return NextResponse.redirect(url)
}
