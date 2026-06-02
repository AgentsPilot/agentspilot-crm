import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { deal_id, contact_name, outcome } = await req.json()

  if (!deal_id || !outcome) {
    return NextResponse.json({ error: 'deal_id and outcome required' }, { status: 400 })
  }

  // ── 1. Update pipeline stage ─────────────────────────────────────────────
  const { error: dealErr } = await supabase
    .from('pipeline_deals')
    .update({ stage: outcome, updated_at: new Date().toISOString() })
    .eq('id', deal_id)

  if (dealErr) {
    return NextResponse.json({ error: dealErr.message }, { status: 500 })
  }

  // ── 2. Auto-create Onboarding task + flip contact to customer if Won ──────
  if (outcome === 'Won' && contact_name) {
    const due = new Date()
    due.setDate(due.getDate() + 1)

    const { error: taskErr } = await supabase.from('tasks').insert([{
      title:           `Onboarding — ${contact_name}`,
      contact_name:    contact_name,
      type:            'Onboarding',
      priority:        'High',
      due_date:        due.toISOString().split('T')[0],
      kanban_status:   'todo',
      done:            false,
      alarm_at:        null,
      alarm_triggered: false,
      notes:           'Auto-created after deal marked Won',
    }])

    if (taskErr) {
      return NextResponse.json({ error: `Task creation failed: ${taskErr.message}` }, { status: 500 })
    }

    // ── Flip contact to customer_paid via contact_stages ─────────────────
    const { data: contactRow } = await supabase
      .from('contacts_current')
      .select('contact_id,stage,state')
      .ilike('first_name', contact_name.split(' ')[0])
      .limit(1)
      .single()

    if (contactRow) {
      await supabase.from('contact_stages').insert({
        contact_id: contactRow.contact_id,
        stage:      'customer_paid',
        state:      'active',
        from_stage: contactRow.stage,
        from_state: contactRow.state,
        changed_by: 'manual',
        notes:      'Converted via CRM pipeline',
      })
    }
  }

  return NextResponse.json({ success: true })
}
