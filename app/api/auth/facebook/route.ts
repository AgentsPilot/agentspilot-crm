import { NextResponse } from 'next/server'

export async function GET() {
  const appId      = process.env.FACEBOOK_APP_ID!
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`)
  // pages_manage_posts  → publish to a Page feed
  // pages_read_engagement → read page info
  // pages_show_list     → list the user's pages to pick which one to use
  const scope = encodeURIComponent('pages_manage_posts,pages_read_engagement,pages_show_list')
  const url = `https://www.facebook.com/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scope}&state=fb_connect`
  return NextResponse.redirect(url)
}
