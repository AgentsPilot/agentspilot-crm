import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID!
  const redirectUri = encodeURIComponent(`${process.env.NEXT_PUBLIC_APP_URL}/api/auth/linkedin/callback`)
  // Requires "Sign In with LinkedIn using OpenID Connect" product enabled on the app
  // (linkedin.com/developers → your app → Products tab → add it — instant approval)
  const hasOpenId = process.env.LINKEDIN_OPENID_ENABLED === 'true'
  const scope = encodeURIComponent(
    hasOpenId ? 'openid profile w_member_social' : 'w_member_social'
  )
  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&state=linkedin_connect`
  return NextResponse.redirect(url)
}
