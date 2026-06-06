import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' })

  const results: Record<string, unknown> = { api_key_prefix: apiKey.substring(0, 8) + '...' }

  // Test inference API with a tiny text model (no cost, just checks auth)
  try {
    const res = await fetch(
      'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: 'red square', parameters: { num_inference_steps: 1 } }),
      }
    )
    const ct = res.headers.get('content-type') || ''
    let body = ''
    if (ct.includes('json')) body = await res.json().then(j => JSON.stringify(j))
    else body = `binary ${res.headers.get('content-length') || '?'} bytes`
    results.flux_status = res.status
    results.flux_content_type = ct
    results.flux_response = body
  } catch (e) {
    results.flux_error = String(e)
  }

  return NextResponse.json(results)
}
