import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { template_id, title, query, design_type, canva_template_url } = await req.json()
  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const jobTitle = design_type === 'infographic' ? `[INFOGRAPHIC] ${title}` : `[CANVA] ${title}`
  const { data, error } = await supabase
    .from('canva_jobs')
    .insert({ template_id, title: jobTitle, status: 'pending' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings: { key: string; value: string }[] = [
    { key: `canva_job_query_${data.id}`, value: query ?? '' },
  ]
  if (design_type) settings.push({ key: `canva_job_type_${data.id}`, value: design_type })
  if (canva_template_url) settings.push({ key: `canva_job_template_url_${data.id}`, value: canva_template_url })
  await supabase.from('app_settings').upsert(settings)

  return NextResponse.json({ job_id: data.id })
}

export async function GET() {
  // Get latest pending job with its query
  const { data: jobs } = await supabase
    .from('canva_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)

  if (!jobs?.length) return NextResponse.json({ job: null })

  const job = jobs[0]
  const { data: settingsRows } = await supabase
    .from('app_settings')
    .select('key, value')
    .like('key', `canva_job_%_${job.id}`)

  const meta: Record<string, string> = {}
  for (const row of settingsRows ?? []) {
    const field = row.key.replace(`canva_job_`, '').replace(`_${job.id}`, '')
    meta[field] = row.value
  }

  return NextResponse.json({
    job: {
      ...job,
      query: meta['query'] ?? job.title,
      design_type: meta['type'] ?? 'post',
      canva_template_url: meta['template_url'] ?? null,
    },
  })
}
