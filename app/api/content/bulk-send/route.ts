import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { content_id, stage } = await req.json()

  if (!content_id || !stage) {
    return NextResponse.json({ error: 'content_id and stage are required' }, { status: 400 })
  }

  // ── 1. Fetch the content piece ────────────────────────────────────────────
  const { data: content, error: contentErr } = await supabase
    .from('content_library')
    .select('*')
    .eq('id', content_id)
    .single()

  if (contentErr || !content) {
    return NextResponse.json({ error: 'Content not found' }, { status: 404 })
  }

  // ── 2. Fetch all deals at the given stage that have an email ──────────────
  const { data: deals, error: dealsErr } = await supabase
    .from('pipeline_deals')
    .select('contact_name, contact_email')
    .eq('stage', stage)
    .not('contact_email', 'is', null)
    .neq('contact_email', '')

  if (dealsErr) {
    return NextResponse.json({ error: dealsErr.message }, { status: 500 })
  }

  if (!deals || deals.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No contacts with email at this stage' })
  }

  // Deduplicate by email
  const unique = deals.filter(
    (d, i, arr) => arr.findIndex(x => x.contact_email === d.contact_email) === i
  )

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const results = { sent: 0, failed: 0, skipped: 0 }

  // ── 3. Send email + create task for each contact ──────────────────────────
  for (const deal of unique) {
    try {
      // Send email
      const emailRes = await fetch(`${appUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email:      deal.contact_email,
          to_name:       deal.contact_name,
          subject:       content.title,
          body:          content.body,
          template_name: 'nurture_content',
        }),
      })

      if (!emailRes.ok) {
        results.failed++
        continue
      }

      // Create task as send log
      const due = new Date().toISOString().split('T')[0]
      await supabase.from('tasks').insert([{
        title:           `Content sent: ${content.title}`,
        contact_name:    deal.contact_name,
        type:            'Email',
        priority:        'Medium',
        due_date:        due,
        kanban_status:   'done',
        done:            true,
        alarm_at:        null,
        alarm_triggered: false,
        notes:           `Nurture content sent to ${deal.contact_email} — Stage: ${stage}`,
      }])

      results.sent++
    } catch {
      results.failed++
    }
  }

  return NextResponse.json({
    success: true,
    sent:    results.sent,
    failed:  results.failed,
    total:   unique.length,
  })
}
