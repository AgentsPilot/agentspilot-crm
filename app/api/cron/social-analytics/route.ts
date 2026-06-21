import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find published posts that have platform post IDs (analytics-eligible)
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, platform_post_ids')
    .eq('status', 'published')
    .not('platform_post_ids', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!posts?.length) return NextResponse.json({ updated: 0 })

  // Fetch LinkedIn connection for token
  const { data: liConn } = await supabase
    .from('social_connections')
    .select('access_token')
    .eq('platform', 'linkedin')
    .single()

  let updated = 0

  for (const post of posts) {
    const ids = post.platform_post_ids as Record<string, string>
    const analytics: Record<string, unknown> = {}

    // ── LinkedIn stats ────────────────────────────────────────────────────
    if (ids.LinkedIn && liConn?.access_token) {
      try {
        const encodedId = encodeURIComponent(ids.LinkedIn)
        const statsRes = await fetch(
          `https://api.linkedin.com/v2/socialActions/${encodedId}?projection=(likesSummary,commentsSummary,shareSummary)`,
          { headers: { Authorization: `Bearer ${liConn.access_token}`, 'X-Restli-Protocol-Version': '2.0.0' } }
        )
        if (statsRes.ok) {
          const stats = await statsRes.json()
          analytics.LinkedIn = {
            likes:    stats.likesSummary?.totalLikes    ?? 0,
            comments: stats.commentsSummary?.totalFirstLevelComments ?? 0,
            shares:   stats.shareSummary?.shareCount    ?? 0,
          }
        }
      } catch { /* skip on error */ }
    }

    if (Object.keys(analytics).length) {
      await supabase.from('social_posts').update({
        analytics,
        analytics_updated_at: new Date().toISOString(),
      }).eq('id', post.id)
      updated++
    }
  }

  return NextResponse.json({ updated })
}
