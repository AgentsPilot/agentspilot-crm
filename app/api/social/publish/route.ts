import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const GRAPH = 'https://graph.facebook.com/v19.0'

export async function POST(req: NextRequest) {
  const { post_id } = await req.json()

  if (!post_id) {
    return NextResponse.json({ error: 'post_id required' }, { status: 400 })
  }

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

  // ── Helper: fetch a stored connection ─────────────────────────────────────
  async function getConn(platform: string) {
    const { data } = await supabase
      .from('social_connections')
      .select('*')
      .eq('platform', platform)
      .single()
    return data
  }

  // ── LinkedIn ──────────────────────────────────────────────────────────────
  if (platforms.includes('LinkedIn')) {
    const conn = await getConn('linkedin')
    if (!conn) {
      results.LinkedIn = { success: false, message: 'Not connected' }
    } else if (!conn.platform_user_id) {
      results.LinkedIn = {
        success: false,
        message: 'Member URN not found — disconnect and reconnect LinkedIn',
      }
    } else {
      try {
        const body = {
          author: conn.platform_user_id,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: post.caption },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
        }
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${conn.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
          body: JSON.stringify(body),
        })
        if (res.ok || res.status === 201) {
          results.LinkedIn = { success: true, message: 'Published!' }
        } else {
          const err = await res.json().catch(() => ({}))
          results.LinkedIn = { success: false, message: err.message ?? `Error ${res.status}` }
        }
      } catch (err: unknown) {
        results.LinkedIn = { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
      }
    }
  }

  // ── Facebook ──────────────────────────────────────────────────────────────
  if (platforms.includes('Facebook')) {
    const conn = await getConn('facebook')
    if (!conn) {
      results.Facebook = { success: false, message: 'Not connected' }
    } else if (!conn.page_id) {
      results.Facebook = { success: false, message: 'No Facebook Page found — reconnect Facebook' }
    } else {
      try {
        const token = conn.page_access_token ?? conn.access_token
        const res = await fetch(`${GRAPH}/${conn.page_id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: post.caption, access_token: token }),
        })
        const data = await res.json()
        if (res.ok && data.id) {
          results.Facebook = { success: true, message: 'Published!' }
        } else {
          results.Facebook = {
            success: false,
            message: data.error?.message ?? `Error ${res.status}`,
          }
        }
      } catch (err: unknown) {
        results.Facebook = { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
      }
    }
  }

  // ── Instagram ─────────────────────────────────────────────────────────────
  // Instagram Graph API requires a media URL for image/video posts.
  // Caption-only posts are not supported — we'll surface a clear message.
  if (platforms.includes('Instagram')) {
    const conn = await getConn('instagram')
    if (!conn) {
      results.Instagram = { success: false, message: 'Not connected' }
    } else if (!conn.platform_user_id) {
      results.Instagram = { success: false, message: 'Instagram account ID missing — reconnect' }
    } else {
      // Check if post has a media URL (future: store in social_posts)
      const mediaUrl: string | null = post.media_url ?? null

      if (!mediaUrl) {
        results.Instagram = {
          success: false,
          message: 'Instagram requires an image — add a media_url to the post',
        }
      } else {
        try {
          const token = conn.page_access_token ?? conn.access_token
          const igId  = conn.platform_user_id

          // Step 1: create media container
          const containerRes = await fetch(`${GRAPH}/${igId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url:    mediaUrl,
              caption:      post.caption,
              access_token: token,
            }),
          })
          const container = await containerRes.json()
          if (!container.id) {
            results.Instagram = {
              success: false,
              message: container.error?.message ?? 'Failed to create media container',
            }
          } else {
            // Step 2: publish the container
            const publishRes = await fetch(`${GRAPH}/${igId}/media_publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ creation_id: container.id, access_token: token }),
            })
            const published = await publishRes.json()
            if (publishRes.ok && published.id) {
              results.Instagram = { success: true, message: 'Published!' }
            } else {
              results.Instagram = {
                success: false,
                message: published.error?.message ?? `Error ${publishRes.status}`,
              }
            }
          }
        } catch (err: unknown) {
          results.Instagram = { success: false, message: err instanceof Error ? err.message : 'Unknown error' }
        }
      }
    }
  }

  // ── Update post status if any platform succeeded ──────────────────────────
  const anySuccess = Object.values(results).some(r => r.success)
  if (anySuccess) {
    await supabase.from('social_posts').update({ status: 'published' }).eq('id', post_id)
  }

  return NextResponse.json({ results })
}
