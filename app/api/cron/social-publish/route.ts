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

  // Find all scheduled posts due today or earlier
  const today = new Date().toISOString().slice(0, 10)
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, collateral, scheduled_date')
    .eq('status', 'scheduled')
    .lte('scheduled_date', today)

  if (error) {
    console.error('social-publish cron: fetch error', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!posts?.length) {
    console.log('social-publish cron: no posts due')
    return NextResponse.json({ published: 0 })
  }

  console.log(`social-publish cron: publishing ${posts.length} post(s)`)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!
  const results: Record<string, unknown> = {}

  for (const post of posts) {
    try {
      const res = await fetch(`${baseUrl}/api/social/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      const data = await res.json()
      results[post.id] = { collateral: post.collateral, date: post.scheduled_date, results: data.results }
      console.log(`social-publish cron: post ${post.id} (${post.collateral}) →`, JSON.stringify(data.results))
    } catch (err) {
      results[post.id] = { error: err instanceof Error ? err.message : 'Unknown error' }
      console.error(`social-publish cron: post ${post.id} failed`, err)
    }
  }

  return NextResponse.json({ published: posts.length, results })
}
