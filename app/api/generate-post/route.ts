import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not set in .env.local' }, { status: 500 })
  }

  const { brief, platform, tone, collateral } = await req.json()

  if (!brief) {
    return NextResponse.json({ error: 'Brief is required' }, { status: 400 })
  }

  const platformGuidance: Record<string, string> = {
    LinkedIn: 'professional, thought-leadership tone, 150-300 words, use line breaks, no more than 3 hashtags',
    Facebook: 'conversational, community-focused, 80-150 words, 2-3 hashtags',
    Instagram: 'visual-first, punchy, 50-100 words, 5-8 relevant hashtags, emoji-friendly',
    TikTok: 'very short, trendy, hook in first line, 30-60 words, 3-5 hashtags',
    Website: 'clear, concise, SEO-friendly, no hashtags',
  }

  const toneGuide: Record<string, string> = {
    Professional: 'authoritative, data-driven, formal but approachable',
    Casual: 'friendly, conversational, like talking to a colleague',
    Bold: 'direct, punchy, confident, short sentences',
    Inspirational: 'motivating, aspirational, story-driven',
  }

  const systemPrompt = `You are an expert social media copywriter for AgentsPilot — an AI-powered CRM platform that helps sales teams automate lead generation, track pipelines, and close deals faster.

Brand voice: Modern, confident, results-focused. We help teams remove manual work and deliver outcomes.

Your task: Write a ready-to-post social media caption.

Platform guidance: ${platformGuidance[platform] ?? 'clear and engaging, 100-200 words'}
Tone: ${toneGuide[tone] ?? 'professional and engaging'}
${collateral ? `Post type: ${collateral}` : ''}

Return ONLY the caption text — no explanations, no "Here is your caption:", just the post copy ready to paste.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Write a ${platform} post about: ${brief}`,
        },
      ],
      system: systemPrompt,
    })

    const caption = message.content[0].type === 'text' ? message.content[0].text : ''

    // Also generate a CTA suggestion
    const ctaMessage = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 100,
      messages: [
        {
          role: 'user',
          content: `Give me ONE short CTA line (under 10 words) for a ${platform} post about: ${brief}. Just the CTA, no explanation.`,
        },
      ],
    })

    const cta = ctaMessage.content[0].type === 'text' ? ctaMessage.content[0].text.trim() : ''

    return NextResponse.json({ caption, cta })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate post'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
