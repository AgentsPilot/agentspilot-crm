import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt } = await req.json()

  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  if (!process.env.HUGGINGFACE_API_KEY) return NextResponse.json({ error: 'HuggingFace API key not configured' }, { status: 500 })

  const response = await fetch(
    'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { num_inference_steps: 4 }
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    return NextResponse.json({ error: err }, { status: 500 })
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  const base64 = buffer.toString('base64')
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return NextResponse.json({ image: `data:${contentType};base64,${base64}`, contentType })
}
