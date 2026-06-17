import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['canva_access_token', 'canva_refresh_token', 'canva_token_expiry'])

  const row = (data ?? []).reduce<Record<string, string>>((acc, r) => {
    acc[r.key] = r.value; return acc
  }, {})

  if (!row.canva_access_token) return null

  const expiry = Number(row.canva_token_expiry ?? 0)
  if (Date.now() < expiry - 5 * 60 * 1000) return row.canva_access_token

  if (!row.canva_refresh_token) return row.canva_access_token
  const res = await fetch('https://api.canva.com/rest/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${process.env.CANVA_CLIENT_ID}:${process.env.CANVA_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: row.canva_refresh_token }),
  })
  const tokens = await res.json()
  if (!res.ok || !tokens.access_token) return row.canva_access_token

  await supabase.from('app_settings').upsert([
    { key: 'canva_access_token',  value: tokens.access_token },
    { key: 'canva_refresh_token', value: tokens.refresh_token ?? row.canva_refresh_token },
    { key: 'canva_token_expiry',  value: String(Date.now() + (tokens.expires_in ?? 3600) * 1000) },
  ])
  return tokens.access_token
}

const DESIGN_DIMENSIONS: Record<string, { width: number; height: number }> = {
  instagram_post:  { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  facebook_post:   { width: 1200, height: 630  },
  twitter_post:    { width: 1600, height: 900  },
  linkedin_post:   { width: 1200, height: 627  },
  poster:          { width: 794,  height: 1123 },
}

export async function POST(req: NextRequest) {
  try {
    const { design_type = 'instagram_post', image_url } = await req.json()

    const token = await getAccessToken()
    if (!token) return NextResponse.json({ error: 'canva_not_connected' }, { status: 401 })

    // If an image URL is provided — download it and import into Canva
    if (image_url) {
      try {
        // Download the image
        const imgRes = await fetch(image_url)
        if (!imgRes.ok) throw new Error('Failed to download image')
        const imgBuffer = await imgRes.arrayBuffer()
        const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
        const ext = contentType.includes('png') ? 'png' : 'jpg'

        // Upload to Canva via multipart
        const form = new FormData()
        form.append('image_metadata', JSON.stringify({ title: 'AgentsPilot Design' }))
        form.append('image', new Blob([imgBuffer], { type: contentType }), `design.${ext}`)

        const importRes = await fetch('https://api.canva.com/rest/v1/imports', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: form,
        })

        const importData = await importRes.json()
        if (importRes.ok) {
          const jobId = importData?.job?.id
          if (jobId) {
            // Poll for completion (max 15s)
            for (let i = 0; i < 15; i++) {
              await new Promise(r => setTimeout(r, 1000))
              const pollRes = await fetch(`https://api.canva.com/rest/v1/imports/${jobId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
              })
              const pollData = await pollRes.json()
              const status = pollData?.job?.status
              if (status === 'success') {
                const editUrl = pollData?.job?.result?.design?.urls?.edit_url
                const designId = pollData?.job?.result?.design?.id
                return NextResponse.json({ edit_url: editUrl, design_id: designId, imported: true })
              }
              if (status === 'failed') break
            }
          }
        } else {
          console.error('[canva-import] failed:', JSON.stringify(importData))
        }
      } catch (importErr) {
        console.error('[canva-import] error:', importErr)
      }
      // Fall through to blank design if import fails
    }

    // Create a blank Canva design (fallback or no image_url)
    const dims = DESIGN_DIMENSIONS[design_type] ?? DESIGN_DIMENSIONS.instagram_post
    const res = await fetch('https://api.canva.com/rest/v1/designs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        design_type: { type: 'custom', width: dims.width, height: dims.height },
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      console.error('[canva-generate] create design failed:', JSON.stringify(data))
      return NextResponse.json({ error: data.message ?? data.error ?? 'Failed to create design', detail: data }, { status: res.status })
    }

    return NextResponse.json({
      edit_url:  data?.design?.urls?.edit_url,
      design_id: data?.design?.id,
    })
  } catch (err) {
    console.error('[canva-generate] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
