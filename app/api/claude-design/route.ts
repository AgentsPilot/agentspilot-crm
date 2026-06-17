import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { title, hook, caption, platforms, hashtags, background, cta, design_prompt } = await req.json()

    const platform  = Array.isArray(platforms) ? platforms[0] : (platforms ?? 'LinkedIn')

    // If a visual design prompt exists — generate a real AI image via /api/generate-image
    if (design_prompt && design_prompt.trim().length > 20) {
      const fullPrompt = `${design_prompt.trim()} Square 1:1 format, high resolution, social media post visual.`
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
      const imgRes = await fetch(`${appUrl}/api/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      })
      const imgData = await imgRes.json()
      if (!imgRes.ok || imgData.error) throw new Error(imgData.error ?? 'Image generation failed')
      return NextResponse.json({ image: imgData.image })
    }

    // Fallback — generate branded SVG text card via Claude
    const hookText  = (hook       ?? cta     ?? '').slice(0, 120)
    const titleText = (title      ?? '').slice(0, 80)
    const bodyText  = (caption    ?? background ?? '').replace(/\n+/g, ' ').slice(0, 200)
    const tagText   = (hashtags   ?? '').slice(0, 80)

    const prompt = `You are a professional graphic designer. Generate a single SVG image (1200×628px) as a branded social media post for AgentsPilot CRM.

CONTENT TO INCLUDE:
- Platform: ${platform}
- Title: "${titleText}"
${hookText ? `- Hook (main headline): "${hookText}"` : ''}
${bodyText ? `- Body (shorter summary, max 20 words): "${bodyText.split(' ').slice(0, 20).join(' ')}…"` : ''}
${tagText  ? `- Hashtags (small, at bottom): "${tagText}"` : ''}

STRICT DESIGN RULES:
- viewBox="0 0 1200 628" width="1200" height="628"
- Background: rectangle fill="#0a0a0a" covering full canvas
- Brand accent color: #f97316 (orange)
- All text: white or orange only
- Font: use font-family="Inter, system-ui, sans-serif"
- Top-left: small logo mark — orange triangle polygon points="30,20 56,35 30,50" fill="#f97316" and text "AGENTS PILOT" next to it in white, font-size="13" font-weight="700" letter-spacing="3"
- Thin orange horizontal rule line after the logo area (y≈70)
- Hook/headline: large, bold, white, font-size between 42 and 52, font-weight="800", within x=60 to x=1140
- Body summary: font-size="22" font-weight="400" fill="#a1a1aa" below the headline
- Hashtags: font-size="16" fill="#f97316" near bottom
- Bottom-right: small label showing the platform name with orange border
- Subtle background detail: 2-3 thin orange diagonal lines at opacity 0.06
- NO external images, NO external URLs, NO clip paths referencing undefined IDs
- SVG must be fully self-contained and valid

Output ONLY the raw SVG code starting with <svg. No markdown fences, no explanation.`

    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 3000,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw = (message.content[0] as { type: string; text: string }).text.trim()
    const svg = raw.startsWith('```')
      ? raw.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim()
      : raw

    if (!svg.startsWith('<svg')) {
      return NextResponse.json({ error: 'Claude returned invalid SVG', detail: svg.slice(0, 200) }, { status: 500 })
    }

    return NextResponse.json({ svg })
  } catch (err: unknown) {
    console.error('[claude-design] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Unknown error' }, { status: 500 })
  }
}
