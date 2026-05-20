import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { to_email, to_name, subject, body, template_name, from_email } = await req.json()

  if (!to_email || !subject || !body) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const fromAddress = from_email || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'

  // If no API key configured, log to Supabase as queued
  if (!apiKey || apiKey === 'YOUR_RESEND_API_KEY') {
    const { error } = await supabase.from('emails').insert([{
      to_email, to_name, subject, body, template_name, status: 'queued',
    }])
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true, status: 'queued', message: 'Email queued (Resend not configured)' })
  }

  // Send via Resend
  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: to_name ? `${to_name} <${to_email}>` : to_email,
      subject,
      html: body.replace(/\n/g, '<br>'),
    })

    if (error) throw new Error(error.message)

    // Log to Supabase
    await supabase.from('emails').insert([{
      to_email, to_name, subject, body, template_name,
      status: 'sent', resend_id: data?.id,
    }])

    return NextResponse.json({ success: true, status: 'sent', id: data?.id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase.from('emails').insert([{
      to_email, to_name, subject, body, template_name, status: 'failed',
    }])
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
