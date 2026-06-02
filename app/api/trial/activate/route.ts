/**
 * POST /api/trial/activate
 * ─────────────────────────────────────────────────────────────────────────────
 * Call this from your product the moment a user does something meaningful —
 * creates their first agent, connects an integration, completes onboarding, etc.
 *
 * Effect:
 *   • Sets contacts.activated_at = now  (idempotent — only sets it once)
 *   • If state is 'inactive' → transitions back to 'active'
 *   • Tags contact as 'activated'
 *   • Marks Trial Activation task as done
 *   • Logs to automation_runs + Timeline
 *
 * Body (JSON):
 *   contact_id   string   required   (UUID)
 *   event        string   optional   e.g. "created_first_agent", "connected_integration"
 *
 * CORS: allows any origin (called from your product's frontend or backend).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: { contact_id?: string; event?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const { contact_id, event } = body
  if (!contact_id) {
    return NextResponse.json({ error: 'contact_id is required' }, { status: 400, headers: CORS })
  }

  // ── 1. Fetch current contact state ────────────────────────────────────────
  const { data: contact, error: fetchErr } = await supabase
    .from('contacts_current')
    .select('contact_id, first_name, last_name, stage, state, activated_at')
    .eq('contact_id', contact_id)
    .maybeSingle()

  if (fetchErr || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404, headers: CORS })
  }

  if (contact.stage !== 'customer_trial') {
    return NextResponse.json(
      { error: 'Contact is not in customer_trial stage', stage: contact.stage },
      { status: 409, headers: CORS },
    )
  }

  const alreadyActivated = !!contact.activated_at
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ')
  const eventLabel = event || 'product activation'

  // ── 2. Set activated_at (idempotent — only first time) ────────────────────
  if (!alreadyActivated) {
    await supabase
      .from('contacts')
      .update({ activated_at: new Date().toISOString() })
      .eq('contact_id', contact_id)
  }

  // ── 3. If inactive → transition back to active ────────────────────────────
  if (contact.state === 'inactive') {
    await supabase.from('contact_stages').insert({
      contact_id:  contact_id,
      stage:       'customer_trial',
      state:       'active',
      from_stage:  'customer_trial',
      from_state:  'inactive',
      changed_by:  'api',
      notes:       `Re-activated: ${eventLabel}`,
    })
  } else if (!alreadyActivated) {
    // Still active but first activation — add a timeline note
    await supabase.from('contact_stages').insert({
      contact_id:  contact_id,
      stage:       'customer_trial',
      state:       contact.state,
      from_stage:  'customer_trial',
      from_state:  contact.state,
      changed_by:  'api',
      notes:       `First activation: ${eventLabel}`,
    })
  }

  // ── 4. Tag + close activation task ───────────────────────────────────────
  if (!alreadyActivated) {
    // Tag
    const { data: tagData } = await supabase
      .from('contacts').select('tags').eq('contact_id', contact_id).single()
    const existing: string[] = (tagData as { tags?: string[] } | null)?.tags ?? []
    if (!existing.includes('activated')) {
      await supabase.from('contacts')
        .update({ tags: [...existing, 'activated'] })
        .eq('contact_id', contact_id)
    }

    // Mark Trial Activation task as done
    await supabase.from('tasks')
      .update({ status: 'done' })
      .eq('contact_id', contact_id)
      .eq('type', 'Trial Activation')
      .neq('status', 'done')

    // Log
    await supabase.from('automation_runs').insert({
      rule_id:      'trial_activated',
      contact_id:   contact_id,
      contact_name: name,
      action:       `Product activation: ${eventLabel} — activated_at set, task done`,
    })
  }

  return NextResponse.json(
    {
      success:           true,
      contact_id,
      already_activated: alreadyActivated,
      event:             eventLabel,
    },
    { status: 200, headers: CORS },
  )
}
