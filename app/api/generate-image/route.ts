import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
    if (!process.env.HUGGINGFACE_API_KEY) return NextResponse.json({ error: 'HUGGINGFACE_API_KEY not set in .env.local' }, { status: 500 })

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

    // HuggingFace returns 503 when model is loading — tell client to retry
    if (response.status === 503) {
      const body = await response.text()
      return NextResponse.json({ error: 'Model is loading, please try again in 20 seconds', loading: true, detail: body }, { status: 503 })
    }

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `HuggingFace error ${response.status}: ${err}` }, { status: 500 })
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // If response is JSON it's an error message, not an image
    if (contentType.includes('application/json')) {
      const json = await response.json()
      return NextResponse.json({ error: JSON.stringify(json) }, { status: 500 })
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Empty response from HuggingFace' }, { status: 500 })
    }

    const base64 = buffer.toString('base64')
    return NextResponse.json({ image: `data:${contentType};base64,${base64}`, contentType })

  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
