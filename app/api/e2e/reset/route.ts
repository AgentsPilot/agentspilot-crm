import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const DEMO_TAGS = ['contacted', 'reminder-7d-sent', 'reminder-21d-sent', 'cold']

export async function POST(req: NextRequest) {
  const { contact_id } = await req.json()
  if (!contact_id) return NextResponse.json({ error: 'contact_id required' }, { status: 400 })

  // Get current stage and tags
  const { data: current } = await supabase
    .from('contacts_current')
    .select('stage, state, tags')
    .eq('contact_id', contact_id)
    .single()

  // Insert a new stage row: lead / new
  const { error: stageErr } = await supabase.from('contact_stages').insert({
    contact_id,
    stage:      'lead',
    state:      'new',
    from_stage: current?.stage ?? 'lead',
    from_state: current?.state ?? null,
    changed_by: 'system',
    notes:      'Reset for E2E demo',
  })

  if (stageErr) return NextResponse.json({ error: stageErr.message }, { status: 500 })

  // Reset score to 50, strip demo tags
  const cleanedTags = ((current?.tags as string[]) ?? []).filter(t => !DEMO_TAGS.includes(t))
  await supabase.from('contacts').update({ lead_score: 50, tags: cleanedTags }).eq('contact_id', contact_id)

  return NextResponse.json({ ok: true, state: 'new', lead_score: 50 })
}
