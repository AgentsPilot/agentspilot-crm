'use client'
import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
  Img,
} from 'remotion'
import type { ExtrapolateType } from 'remotion'

export type ProductDemoProps = {
  title: string
  caption: string
  platform: string
  screenshotUrls: string[]  // up to 3
}

const CLAMP = 'clamp' as ExtrapolateType
function ip(frame: number, from: number, to: number, lo: number, hi: number) {
  return interpolate(frame, [lo, hi], [from, to], { extrapolateLeft: CLAMP, extrapolateRight: CLAMP })
}
function sp(frame: number, delay: number, fps: number, stiffness = 300, damping = 22) {
  return spring({ frame: Math.max(0, frame - delay), fps, config: { stiffness, damping, mass: 1 } })
}

const SCENE_FRAMES = 80  // frames per screenshot scene
const CTA_FRAMES  = 60

// ── Scene: Zoom-in reveal (first screenshot) ────────────────────────────────
function SceneZoom({ url, title }: { url: string; title: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const scale = ip(frame, 1.14, 1.0, 0, SCENE_FRAMES)
  const alpha = ip(frame, 0, 1, 0, 16)
  const badgeS = sp(frame, 18, fps, 260, 24)
  return (
    <AbsoluteFill style={{ background: '#0d0d0f', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${scale})`, opacity: alpha, transformOrigin: 'center center' }}>
        <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
      </div>
      {/* Logo */}
      <div style={{ position: 'absolute', top: 28, left: 40, display: 'flex', alignItems: 'center', gap: 9, opacity: ip(frame, 0, 1, 8, 22) }}>
        <div style={{ width: 0, height: 0, borderTop: '7px solid transparent', borderBottom: '7px solid transparent', borderLeft: '14px solid #f97316' }} />
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 800, letterSpacing: 5, fontFamily: 'Inter,system-ui,sans-serif' }}>AGENTS PILOT</span>
      </div>
      {/* Title badge */}
      <div style={{ position: 'absolute', bottom: 52, left: 40, opacity: Math.min(badgeS, 1), transform: `translateY(${interpolate(Math.min(badgeS, 1), [0,1], [18,0])}px)` }}>
        <div style={{ background: 'rgba(249,115,22,0.14)', border: '1.5px solid #f97316', borderRadius: 10, padding: '9px 18px', backdropFilter: 'blur(12px)', boxShadow: '0 0 20px rgba(249,115,22,0.22)' }}>
          <p style={{ color: '#f97316', fontSize: 10, fontWeight: 800, letterSpacing: 4, textTransform: 'uppercase', fontFamily: 'Inter,system-ui,sans-serif', margin: 0 }}>Product Demo</p>
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', fontFamily: 'Inter,system-ui,sans-serif', margin: '3px 0 0' }}>{title.length > 42 ? title.slice(0, 42) + '…' : title}</p>
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ── Scene: Pan left-to-right with callouts (subsequent screenshots) ──────────
function ScenePan({ url, caption, index }: { url: string; caption: string; index: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const dir   = index % 2 === 0 ? 1 : -1
  const panX  = ip(frame, 0, dir * -55, 0, SCENE_FRAMES)
  const lines = caption.split(/[\n.!?]/).map(l => l.trim()).filter(l => l.length > 3).slice(0, 3)

  return (
    <AbsoluteFill style={{ background: '#0d0d0f', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${panX}px) scale(1.14)`, transformOrigin: 'center center' }}>
        <Img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.50)' }} />
      </div>
      {/* Callout cards */}
      <div style={{ position: 'absolute', right: 44, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14, maxWidth: 360 }}>
        {lines.map((line, i) => {
          const f = frame - i * 14
          const s = f > 0 ? sp(f, 0, fps, 230, 24) : 0
          return (
            <div key={i} style={{
              transform: `translateX(${interpolate(Math.min(s,1), [0,1], [110,0])}px)`, opacity: Math.min(s,1),
              background: 'rgba(13,13,15,0.88)', backdropFilter: 'blur(16px)',
              border: '1px solid rgba(249,115,22,0.28)', borderRadius: 11,
              padding: '10px 14px', display: 'flex', alignItems: 'flex-start', gap: 9,
              boxShadow: '0 4px 20px rgba(0,0,0,0.38)',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: 'rgba(249,115,22,0.18)', border: '1.5px solid #f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f97316', fontSize: 11, fontWeight: 900, fontFamily: 'Inter,system-ui,sans-serif' }}>{i + 1}</div>
              <span style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 600, lineHeight: 1.4, fontFamily: 'Inter,system-ui,sans-serif' }}>{line.length > 52 ? line.slice(0, 52) + '…' : line}</span>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

// ── Scene: CTA finale ────────────────────────────────────────────────────────
function SceneCTA({ platform }: { platform: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const s     = sp(frame, 0, fps, 500, 18)
  const scale = interpolate(Math.min(s,1), [0,1], [4,1])
  const ctaS  = sp(frame, 22, fps, 260, 22)
  const ringP = (frame % 40) / 40

  return (
    <AbsoluteFill style={{ background: '#0d0d0f' }}>
      <div style={{ position: 'absolute', top: '42%', left: '50%', width: 96*(1+ringP*2), height: 96*(1+ringP*2), borderRadius: '50%', border: '1.5px solid #f97316', transform: 'translate(-50%,-50%)', opacity: (1-ringP)*0.4 }} />
      <div style={{ position: 'absolute', top: '38%', left: '50%', transform: `translate(-50%,-50%) scale(${scale})`, opacity: Math.min(s,1), textAlign: 'center' }}>
        <div style={{ width: 62, height: 62, margin: '0 auto', background: 'linear-gradient(135deg,#f97316,#ea580c)', borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 36px rgba(249,115,22,0.7)', fontSize: 22, fontWeight: 900, color: '#000', fontFamily: 'Inter,system-ui,sans-serif' }}>▶</div>
        <div style={{ marginTop: 10, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: 5, fontFamily: 'Inter,system-ui,sans-serif' }}>AGENTS PILOT</div>
      </div>
      <div style={{ position: 'absolute', bottom: 96, left: 0, right: 0, textAlign: 'center', transform: `translateY(${interpolate(Math.min(ctaS,1),[0,1],[26,0])}px)`, opacity: Math.min(ctaS,1) }}>
        <span style={{ color: '#f97316', fontSize: 17, fontWeight: 800, fontFamily: 'Inter,system-ui,sans-serif', textShadow: '0 0 22px #f97316' }}>See it in action ↗</span>
      </div>
      <div style={{ position: 'absolute', bottom: 44, left: 0, right: 0, textAlign: 'center', opacity: ip(frame, 0, 1, 28, 48) }}>
        <span style={{ color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: 600, letterSpacing: 3, fontFamily: 'Inter,system-ui,sans-serif', textTransform: 'uppercase' }}>{platform}</span>
      </div>
    </AbsoluteFill>
  )
}

// ── Main composition ─────────────────────────────────────────────────────────
export function ProductDemoComposition({ title, caption, platform, screenshotUrls }: ProductDemoProps) {
  const urls   = screenshotUrls.filter(Boolean).slice(0, 3)
  const total  = urls.length * SCENE_FRAMES + CTA_FRAMES

  return (
    <AbsoluteFill style={{ background: '#0d0d0f' }}>
      {urls.map((url, i) => (
        <Sequence key={i} from={i * SCENE_FRAMES} durationInFrames={SCENE_FRAMES}>
          {i === 0
            ? <SceneZoom url={url} title={title} />
            : <ScenePan  url={url} caption={caption} index={i} />
          }
        </Sequence>
      ))}
      <Sequence from={urls.length * SCENE_FRAMES} durationInFrames={CTA_FRAMES}>
        <SceneCTA platform={platform} />
      </Sequence>
    </AbsoluteFill>
  )
}

export const PRODUCT_DEMO_FRAMES = (count: number) => Math.max(1, count) * SCENE_FRAMES + CTA_FRAMES
