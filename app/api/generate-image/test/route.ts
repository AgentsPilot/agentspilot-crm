import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.HUGGINGFACE_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' })

  try {
    // Just check if HuggingFace is reachable
    const res = await fetch('https://huggingface.co', { method: 'HEAD' })
    return NextResponse.json({
      hf_reachable: res.ok,
      status: res.status,
      api_key_set: true,
      api_key_prefix: apiKey.substring(0, 8) + '...',
    })
  } catch (e) {
    return NextResponse.json({ hf_reachable: false, error: String(e), api_key_set: true })
  }
}
