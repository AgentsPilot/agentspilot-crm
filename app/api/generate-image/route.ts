import { NextRequest, NextResponse } from 'next/server'

// Try models in order until one works
const MODELS = [
  'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
  'https://api-inference.huggingface.co/models/stabilityai/sdxl-turbo',
  'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
]

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json()

    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 })

    const apiKey = process.env.HUGGINGFACE_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'HUGGINGFACE_API_KEY not set — restart the dev server after adding it to .env.local' }, { status: 500 })

    for (const modelUrl of MODELS) {
      let response: Response
      try {
        response = await fetch(modelUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: { num_inference_steps: 4 }
          }),
        })
      } catch (fetchErr) {
        // Network error on this model — try next
        console.error(`fetch failed for ${modelUrl}:`, fetchErr)
        continue
      }

      // Model loading — tell client to retry
      if (response.status === 503) {
        const body = await response.text()
        return NextResponse.json({ loading: true, error: 'Model loading, retry in 20s', detail: body }, { status: 503 })
      }

      if (!response.ok) {
        const err = await response.text()
        console.error(`Model ${modelUrl} returned ${response.status}: ${err}`)
        continue // try next model
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg'

      // If JSON came back instead of image — it's an error
      if (contentType.includes('application/json')) {
        const json = await response.json()
        console.error('Model returned JSON error:', json)
        continue
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      if (buffer.length === 0) { continue }

      return NextResponse.json({
        image: `data:${contentType};base64,${buffer.toString('base64')}`,
        contentType,
        model: modelUrl,
      })
    }

    return NextResponse.json({ error: 'All models failed. Check your HuggingFace API key and network connection.' }, { status: 500 })

  } catch (e) {
    console.error('generate-image error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
