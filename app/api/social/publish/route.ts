import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { post_id } = await req.json()

  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }

  // Fetch the post
  const { data: post, error: postError } = await supabase
    .from('social_posts')
    .select('*')
    .eq('id', post_id)
    .single()

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const platforms = post.platforms.split(',').map((p: string) => p.trim())
  const results: Record<string, { success: boolean; message: string }> = {}

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  if (platforms.includes('LinkedIn')) {
    const { data: conn } = await supabase
      .from('social_connections')
      .select('*')
      .eq('platform', 'linkedin')
      .single()

    if (!conn) {
      results.LinkedIn = { success: false, message: 'Not connected' }
    } else {
      // Use stored author URN (resolved during OAuth connect)
      const authorUrn = conn.platform_user_id
      if (!authorUrn) {
        results.LinkedIn = {
          success: false,
          message: 'Member URN not found — please disconnect and reconnect your LinkedIn account',
        }
      } else {
        try {
          console.log('Publishing as:', authorUrn)

          const body = {
            author: authorUrn,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: post.caption },
                shareMediaCategory: 'NONE',
              },
            },
            visibility: {
              'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
            },
          }

          const publishRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${conn.access_token}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify(body),
          })

          if (publishRes.ok || publishRes.status === 201) {
            results.LinkedIn = { success: true, message: 'Published!' }
          } else {
            const errData = await publishRes.json().catch(() => ({}))
            results.LinkedIn = {
              success: false,
              message: errData.message ?? `Error ${publishRes.status}`,
            }
          }
        } catch (err: unknown) {
          results.LinkedIn = {
            success: false,
            message: err instanceof Error ? err.message : 'Unknown error',
          }
        }
      }
    }
  }

  // Update post status if at least one platform succeeded
  const anySuccess = Object.values(results).some(r => r.success)
  if (anySuccess) {
    await supabase
      .from('social_posts')
      .update({ status: 'published' })
      .eq('id', post_id)
  }

  return NextResponse.json({ results })
}
