'use client'
import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  Sequence,
} from 'remotion'
import type { ExtrapolateType } from 'remotion'

export type AiMovieProps = {
  imageUrl: string
  hook: string
  caption: string
  cta: string
  platform: string
}

const CLAMP = 'clamp' as ExtrapolateType
function ip(frame: number, from: number, to: number, lo: number, hi: number) {
  return interpolate(frame, [lo, hi], [from, to], { extrapolateLeft: CLAMP, extrapolateRight: CLAMP })
}
function sp(frame: number, delay: number, fps: number, stiffness = 280, damping = 24) {
  return spring({ frame: Math.max(0, frame - delay), fps, config: { stiffness, damping, mass: 1 } })
}

export const AI_MOVIE_FRAMES = 360  // 12s at 30fps

// ── Scene 1: Punch-in zoom (0–160 frames) ────────────────────────────────────
// Fast aggressive zoom in to grab attention, then slow settle
function SceneIntro({ imageUrl, hook, cta }: { imageUrl: string; hook: string; cta: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Aggressive punch-in zoom: 1.25 → 1.04
  const scale = ip(frame, 1.25, 1.04, 0, 160)
  // Subtle pan left
  const panX = ip(frame, 12, -8, 0, 160)
  // Overlay darkens as we settle
  const overlayAlpha = ip(frame, 0.2, 0.55, 0, 80)

  // Light flare sweep: a diagonal bright line that crosses the frame at frame 20–50
  const flareAlpha = ip(frame, 0, 1, 16, 28) * ip(frame, 1, 0, 36, 58)
  const flareX = ip(frame, -60, 140, 16, 58)

  // Logo
  const logoAlpha = ip(frame, 0, 1, 8, 24)

  // Hook: fast spring slam
  const hookS = sp(frame, 30, fps, 400, 26)

  // CTA: slides in after hook
  const ctaS = sp(frame, 70, fps, 260, 22)

  const hookTrim = hook.length > 55 ? hook.slice(0, 55) + '…' : hook

  return (
    <AbsoluteFill style={{ background: '#080810', overflow: 'hidden' }}>
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${scale}) translateX(${panX}px)`,
        transformOrigin: 'center center',
      }}>
        <Img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Dark overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(160deg, rgba(0,0,0,${overlayAlpha * 0.5}) 0%, rgba(0,0,0,${overlayAlpha}) 100%)`,
      }} />

      {/* Bottom gradient for text legibility */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 40%, transparent 70%)',
      }} />

      {/* Light flare sweep */}
      <div style={{
        position: 'absolute', top: 0, bottom: 0,
        left: `${flareX}%`, width: '6%',
        background: 'linear-gradient(to right, transparent, rgba(249,115,22,0.18), rgba(255,255,255,0.08), transparent)',
        transform: 'skewX(-18deg)',
        opacity: flareAlpha,
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{ position: 'absolute', top: 28, left: 40, display: 'flex', alignItems: 'center', gap: 9, opacity: logoAlpha }}>
        <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '16px solid #f97316' }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 800, letterSpacing: 5, fontFamily: 'Inter,system-ui,sans-serif' }}>AGENTS PILOT</span>
      </div>

      {/* Hook — slams in */}
      <div style={{
        position: 'absolute', bottom: cta ? 120 : 80, left: 40, right: 40,
        opacity: Math.min(hookS, 1),
        transform: `translateY(${interpolate(Math.min(hookS, 1), [0, 1], [32, 0])}px) scale(${interpolate(Math.min(hookS, 1), [0, 1], [0.92, 1])})`,
      }}>
        <p style={{
          color: '#fff', fontSize: 32, fontWeight: 900, lineHeight: 1.15,
          letterSpacing: '-0.5px', fontFamily: 'Inter,system-ui,sans-serif', margin: 0,
          textShadow: '0 2px 24px rgba(0,0,0,0.8)',
        }}>{hookTrim}</p>
      </div>

      {/* Orange accent bar */}
      <div style={{
        position: 'absolute',
        bottom: cta ? 108 : 68,
        left: 40,
        height: 3, borderRadius: 2,
        width: ip(Math.min(hookS, 1), 0, 180, 0, 1),
        background: 'linear-gradient(to right, #f97316, #fb923c, rgba(249,115,22,0))',
      }} />

      {/* CTA */}
      {cta && (
        <div style={{
          position: 'absolute', bottom: 72, left: 40,
          opacity: Math.min(ctaS, 1),
          transform: `translateX(${interpolate(Math.min(ctaS, 1), [0, 1], [-20, 0])}px)`,
        }}>
          <span style={{
            color: '#fb923c', fontSize: 14, fontWeight: 800,
            fontFamily: 'Inter,system-ui,sans-serif',
            textShadow: '0 0 20px rgba(249,115,22,0.7)',
          }}>{cta.length > 65 ? cta.slice(0, 65) + '…' : cta}</span>
        </div>
      )}
    </AbsoluteFill>
  )
}

// ── Scene 2: Pull-back reveal with caption (160–360 frames) ──────────────────
// Zoom zooms OUT slowly — creates a reveal / "bigger picture" feel
function SceneReveal({ imageUrl, caption, platform }: { imageUrl: string; caption: string; platform: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Pull-back: 1.06 → 1.0
  const scale = ip(frame, 1.06, 1.0, 0, 200)
  // Pan RIGHT (contrast to scene 1 which panned left)
  const panX = ip(frame, -8, 14, 0, 200)

  // Caption
  const captionAlpha = ip(frame, 0, 1, 20, 50)
  const captionY = ip(frame, 18, 0, 20, 50)

  // Platform badge
  const badgeAlpha = ip(frame, 0, 1, 120, 150)

  // Pulse ring for CTA area — appears near end
  const ringProgress = frame > 140 ? ((frame - 140) % 45) / 45 : 0
  const ringAlpha = frame > 140 ? ip(frame, 0, 1, 140, 165) : 0

  const captionTrim = caption.length > 130 ? caption.slice(0, 130) + '…' : caption

  return (
    <AbsoluteFill style={{ background: '#080810', overflow: 'hidden' }}>
      {/* Background image */}
      <div style={{
        position: 'absolute', inset: 0,
        transform: `scale(${scale}) translateX(${panX}px)`,
        transformOrigin: 'center center',
      }}>
        <Img src={imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.12) 100%)',
      }} />

      {/* Logo */}
      <div style={{ position: 'absolute', top: 28, left: 40, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 0, height: 0, borderTop: '8px solid transparent', borderBottom: '8px solid transparent', borderLeft: '16px solid #f97316' }} />
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 800, letterSpacing: 5, fontFamily: 'Inter,system-ui,sans-serif' }}>AGENTS PILOT</span>
      </div>

      {/* Caption */}
      <div style={{
        position: 'absolute', bottom: 80, left: 40, right: 40,
        opacity: captionAlpha,
        transform: `translateY(${captionY}px)`,
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.82)', fontSize: 15, fontWeight: 500,
          lineHeight: 1.55, fontFamily: 'Inter,system-ui,sans-serif', margin: 0,
          textShadow: '0 1px 10px rgba(0,0,0,0.7)',
        }}>{captionTrim}</p>
      </div>

      {/* Pulse ring + platform */}
      <div style={{ position: 'absolute', bottom: 36, left: 40, display: 'flex', alignItems: 'center', gap: 14, opacity: badgeAlpha }}>
        <div style={{ position: 'relative', width: 20, height: 20 }}>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 20 + ringProgress * 24, height: 20 + ringProgress * 24,
            borderRadius: '50%', border: '1.5px solid #f97316',
            opacity: (1 - ringProgress) * ringAlpha * 0.6,
            transform: 'translate(-50%, -50%)',
          }} />
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 10, height: 10, borderRadius: '50%', background: '#f97316',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 10px #f97316',
          }} />
        </div>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: 4, fontFamily: 'Inter,system-ui,sans-serif', textTransform: 'uppercase' }}>{platform}</span>
      </div>
    </AbsoluteFill>
  )
}

// ── Main composition ──────────────────────────────────────────────────────────
export function AiMovieComposition({ imageUrl, hook, caption, cta, platform }: AiMovieProps) {
  return (
    <AbsoluteFill style={{ background: '#080810' }}>
      <Sequence from={0} durationInFrames={160}>
        <SceneIntro imageUrl={imageUrl} hook={hook} cta={cta} />
      </Sequence>
      <Sequence from={160} durationInFrames={200}>
        <SceneReveal imageUrl={imageUrl} caption={caption} platform={platform} />
      </Sequence>
    </AbsoluteFill>
  )
}
