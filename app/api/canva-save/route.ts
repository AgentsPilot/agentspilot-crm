import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/canva-save
// Body: { canva_url: string, template_title: string }
// Downloads the Canva export, uploads to Supabase storage, updates template
export async function POST(req: NextRequest) {
  try {
    const { canva_url, template_title } = await req.json()
    if (!canva_url || !template_title) {
      return NextResponse.json({ error: 'canva_url and template_title required' }, { status: 400 })
    }

    // Download image from Canva
    const imageRes = await fetch(canva_url)
    if (!imageRes.ok) return NextResponse.json({ error: 'Failed to download from Canva' }, { status: 500 })

    const buffer = Buffer.from(await imageRes.arrayBuffer())
    const contentType = imageRes.headers.get('content-type') || 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const path = `canva-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('post-designs')
      .upload(path, buffer, { contentType, upsert: true })

    if (error || !data) return NextResponse.json({ error: 'Upload failed: ' + error?.message }, { status: 500 })

    const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)

    // Update template in DB
    const { error: updateError } = await supabase
      .from('post_templates')
      .update({ design_preview_url: publicUrl })
      .eq('title', template_title)

    if (updateError) return NextResponse.json({ error: 'DB update failed: ' + updateError.message }, { status: 500 })

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
