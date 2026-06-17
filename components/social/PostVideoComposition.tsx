'use client'
import React from 'react'
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from 'remotion'
import type { ExtrapolateType } from 'remotion'

export type PostVideoProps = {
  title:    string
  hook:     string
  caption:  string
  platform: string
  hashtags: string
  aiPrompt?: string
}

// ── Video palette system ────────────────────────────────────────────────────
type VideoPalette = {
  bgBase: string
  keyLight: string
  counterLight: string
  shadowLight: string
  thread1: string
  thread2: string
  thread3: string  // accent counter thread
  particleA: string; particleB: string
}

const VIDEO_PALETTES: Record<string, VideoPalette> = {
  brand: {
    bgBase: '#0d0d0f',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(249,115,22,0.13) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(56,189,248,0.10) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(99,102,241,0.08) 0%, transparent 60%)',
    thread1: '#f97316', thread2: '#fb923c', thread3: '#38bdf8',
    particleA: '#f97316', particleB: '#38bdf8',
  },
  crimson: {
    bgBase: '#0c0101',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(220,38,38,0.18) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(249,115,22,0.08) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(127,29,29,0.14) 0%, transparent 60%)',
    thread1: '#dc2626', thread2: '#f97316', thread3: '#fca5a5',
    particleA: '#ef4444', particleB: '#f97316',
  },
  electric: {
    bgBase: '#020812',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(59,130,246,0.16) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(6,182,212,0.12) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(99,102,241,0.10) 0%, transparent 60%)',
    thread1: '#3b82f6', thread2: '#60a5fa', thread3: '#06b6d4',
    particleA: '#38bdf8', particleB: '#6366f1',
  },
  emerald: {
    bgBase: '#020e05',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(16,185,129,0.15) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(6,182,212,0.08) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(5,150,105,0.12) 0%, transparent 60%)',
    thread1: '#10b981', thread2: '#34d399', thread3: '#06b6d4',
    particleA: '#6ee7b7', particleB: '#f97316',
  },
  premium: {
    bgBase: '#080412',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(245,158,11,0.12) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(168,85,247,0.12) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(236,72,153,0.08) 0%, transparent 60%)',
    thread1: '#f59e0b', thread2: '#a855f7', thread3: '#ec4899',
    particleA: '#fbbf24', particleB: '#c084fc',
  },
  warm: {
    bgBase: '#120a04',
    keyLight: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(245,158,11,0.15) 0%, transparent 70%)',
    counterLight: 'radial-gradient(ellipse 40% 40% at 82% 12%, rgba(251,146,60,0.08) 0%, transparent 65%)',
    shadowLight: 'radial-gradient(ellipse 35% 35% at 15% 88%, rgba(217,119,6,0.10) 0%, transparent 60%)',
    thread1: '#f59e0b', thread2: '#fb923c', thread3: '#fcd34d',
    particleA: '#fcd34d', particleB: '#fb923c',
  },
}

function parseVideoPalette(prompt: string): VideoPalette {
  const p = prompt.toLowerCase()
  if (/chaos|overwhelm|frustrat|pain|clutter|mess|anger|broken|crack|scatter|warning|tangl/.test(p)) return VIDEO_PALETTES.crimson
  if (/electric|circuit|tech|data|digital|neon|cyber|stream|flow|matrix|code|fintech|futur/.test(p)) return VIDEO_PALETTES.electric
  if (/growth|success|result|win|triumph|emerge|bloom|rise|green|outcome/.test(p)) return VIDEO_PALETTES.emerald
  if (/launch|reveal|premium|luxury|purple|spotlight|drama|smoke|cinematic|product/.test(p)) return VIDEO_PALETTES.premium
  if (/warm|human|question|poll|personal|story|amber|gold|approachab/.test(p)) return VIDEO_PALETTES.warm
  return VIDEO_PALETTES.brand
}

const CLAMP = 'clamp' as ExtrapolateType
function ip(frame: number, from: number, to: number, lo: number, hi: number) {
  return interpolate(frame, [lo, hi], [from, to], { extrapolateLeft: CLAMP, extrapolateRight: CLAMP })
}
function sp(frame: number, delay: number, fps: number, stiffness = 300, damping = 22) {
  return spring({ frame: Math.max(0, frame - delay), fps, config: { stiffness, damping, mass: 1 } })
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// ── Cinematic background ────────────────────────────────────────────────────
// Palette-driven: background, light sources, and thread colors adapt per template

function CinematicBg({ pal }: { pal: VideoPalette }) {
  const frame = useCurrentFrame()

  // Slow rotation for each orbital ring
  const rot1 =  frame * 0.4
  const rot2 = -frame * 0.28
  const rot3 =  frame * 0.18
  const rot4 = -frame * 0.12

  // Breathing pulse
  const breathe = 1 + Math.sin(frame * 0.04) * 0.06

  return (
    <AbsoluteFill style={{ background: pal.bgBase, overflow: 'hidden' }}>

      {/* Key light: warm center glow */}
      <div style={{ position: 'absolute', inset: 0, background: pal.keyLight }} />

      {/* Counter-light from top-right */}
      <div style={{ position: 'absolute', inset: 0, background: pal.counterLight }} />

      {/* Shadow/fill from bottom-left */}
      <div style={{ position: 'absolute', inset: 0, background: pal.shadowLight }} />

      {/* SVG Möbius / glowing thread rings */}
      <svg
        viewBox="0 0 1200 628"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <defs>
          <filter id="glow-lg">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-sm">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glow-xl">
            <feGaussianBlur stdDeviation="18" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="blur-dof">
            <feGaussianBlur stdDeviation="5"/>
          </filter>
        </defs>

        {/* Outermost ring — blurred (depth of field far) */}
        <g transform={`translate(600,314) rotate(${rot4}) scale(${breathe * 1.05})`} filter="url(#blur-dof)">
          <ellipse cx="0" cy="0" rx="520" ry="220"
            fill="none" stroke="#f97316" strokeWidth="1"
            strokeDasharray="40 20"
            opacity="0.18"/>
        </g>

        {/* Ring A — main Möbius horizontal loop */}
        <g transform={`translate(600,314) rotate(${rot1})`} filter="url(#glow-lg)">
          <ellipse cx="0" cy="0" rx="400" ry="160"
            fill="none" stroke={pal.thread1} strokeWidth="2.5"
            strokeDasharray="60 15"
            opacity="0.55"/>
        </g>

        {/* Ring B — tilted ~45° — cross-thread */}
        <g transform={`translate(600,314) rotate(${rot2 + 45}) skewX(8)`} filter="url(#glow-lg)">
          <ellipse cx="0" cy="0" rx="360" ry="130"
            fill="none" stroke={pal.thread2} strokeWidth="1.8"
            strokeDasharray="80 30"
            opacity="0.42"/>
        </g>

        {/* Ring C — near vertical — depth axis */}
        <g transform={`translate(600,314) rotateX(70deg) rotate(${rot3 + 20})`}
           style={{ transformOrigin: '600px 314px' }} filter="url(#glow-sm)">
          <ellipse cx="600" cy="314" rx="290" ry="60"
            fill="none" stroke={pal.thread1} strokeWidth="1.5"
            strokeDasharray="30 40"
            opacity="0.35"/>
        </g>

        {/* Inner bright thread — close focal point */}
        <g transform={`translate(600,314) rotate(${rot1 * 1.3 + 15})`} filter="url(#glow-xl)">
          <ellipse cx="0" cy="0" rx="220" ry="88"
            fill="none" stroke={pal.thread3} strokeWidth="3"
            strokeDasharray="25 80"
            opacity="0.3"/>
        </g>

        {/* Bright orange thread — highlight */}
        <g transform={`translate(600,314) rotate(${rot2 * 0.9 - 30})`} filter="url(#glow-xl)">
          <ellipse cx="0" cy="0" rx="280" ry="112"
            fill="none" stroke="#f97316" strokeWidth="4"
            strokeDasharray="15 120"
            opacity="0.7"/>
        </g>

        {/* Cool-blue counter threads */}
        <g transform={`translate(600,314) rotate(${rot4 + 90})`} filter="url(#glow-sm)">
          <ellipse cx="0" cy="0" rx="340" ry="100"
            fill="none" stroke="#38bdf8" strokeWidth="1.2"
            strokeDasharray="20 60"
            opacity="0.22"/>
        </g>

        {/* Particle field — tiny light dots */}
        {Array.from({ length: 28 }).map((_, i) => {
          const angle  = (i / 28) * Math.PI * 2 + frame * (i % 2 === 0 ? 0.008 : -0.006)
          const radius = 160 + (i % 5) * 60 + Math.sin(frame * 0.03 + i) * 20
          const px     = 600 + Math.cos(angle) * radius * (1 + (i % 3) * 0.3)
          const py     = 314 + Math.sin(angle) * radius * 0.4 * (1 + (i % 2) * 0.2)
          const size   = 1 + (i % 3)
          const bright = i % 4 === 0
          return (
            <circle key={i} cx={px} cy={py} r={size}
              fill={bright ? pal.particleA : i % 5 === 0 ? pal.particleB : pal.particleA}
              opacity={0.3 + (i % 3) * 0.25}
              filter={bright ? 'url(#glow-sm)' : undefined}
            />
          )
        })}

        {/* Central glow core */}
        <circle cx="600" cy="314" r="32"
          fill="transparent"
          opacity={0.08 + Math.sin(frame * 0.05) * 0.04}/>
        <circle cx="600" cy="314" r={18 * breathe}
          fill={pal.thread1} opacity="0.12" filter="url(#glow-xl)"/>
      </svg>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 38%, rgba(0,0,0,0.75) 100%)',
        pointerEvents: 'none',
      }} />

      {/* Subtle scan lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.35) 3px, rgba(0,0,0,0.35) 4px)',
        opacity: 0.4,
        pointerEvents: 'none',
      }} />
    </AbsoluteFill>
  )
}

// ── Impact flash — only fires at the specified frame ────────────────────────
function ImpactFlash({ at, duration = 5 }: { at: number; duration?: number }) {
  const frame = useCurrentFrame()
  if (frame < at) return null
  const alpha = ip(frame, 0.9, 0, at, at + duration)
  if (alpha <= 0.01) return null
  return (
    <AbsoluteFill style={{
      background: 'radial-gradient(ellipse at center, #fff7ed 0%, #f97316 40%, transparent 75%)',
      opacity: alpha, zIndex: 500, pointerEvents: 'none',
    }} />
  )
}

// ── Word slam ───────────────────────────────────────────────────────────────
function SlamWord({ word, startFrame, fps, color = '#fff', size = 72, x = 50, y = 50, delay = 0 }: {
  word: string; startFrame: number; fps: number
  color?: string; size?: number; x?: number; y?: number; delay?: number
}) {
  const frame = useCurrentFrame()
  const f = frame - startFrame - delay
  if (f < 0) return null
  const s     = sp(f, 0, fps, 500, 18)
  const scale = interpolate(s, [0,1], [3.5,1])
  const alpha = clamp(s, 0, 1)
  const blur  = interpolate(s, [0,1], [16,0])
  return (
    <div style={{
      position: 'absolute', left: `${x}%`, top: `${y}%`,
      transform: `translate(-50%,-50%) scale(${scale})`,
      opacity: alpha, filter: `blur(${blur}px)`,
      color, fontSize: size, fontWeight: 900,
      fontFamily: 'Inter, system-ui, sans-serif',
      letterSpacing: '-2px', lineHeight: 1, whiteSpace: 'nowrap',
      textShadow: color === '#f97316'
        ? '0 0 40px #f97316, 0 0 80px rgba(249,115,22,0.4)'
        : '0 2px 32px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)',
      transformOrigin: 'center center',
    }}>{word}</div>
  )
}

// ── Scene 1: Cinematic reveal ───────────────────────────────────────────────
function SceneReveal({ title, hook, platform }: { title: string; hook: string; platform: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headline = hook || title || 'Your Story'
  const words    = headline.split(' ').slice(0, 5)

  // Platform badge fade+slide
  const badgeAlpha = ip(frame, 0, 1, 30, 55)
  const badgeTx    = ip(frame, 20, 0, 30, 55)

  // Sub-label slide up
  const subAlpha = ip(frame, 0, 1, 45, 65)
  const subTy    = ip(frame, 16, 0, 45, 65)

  return (
    <AbsoluteFill>
      {/* Words slam in from center */}
      {words.map((w, i) => (
        <SlamWord key={i} word={w} startFrame={0} fps={fps} delay={i * 7}
          color={i % 3 === 1 ? '#f97316' : '#ffffff'}
          size={i === 0 ? 90 : 72}
          x={18 + i * 14} y={36 + i * 13}
        />
      ))}

      {/* Platform badge */}
      <div style={{
        position: 'absolute', bottom: 52, right: 60,
        opacity: badgeAlpha, transform: `translateX(${badgeTx}px)`,
        border: '1.5px solid #f97316', borderRadius: 8,
        padding: '6px 18px', color: '#f97316',
        fontSize: 12, fontWeight: 800, letterSpacing: 4,
        fontFamily: 'Inter, system-ui, sans-serif',
        textTransform: 'uppercase',
        boxShadow: '0 0 16px rgba(249,115,22,0.35)',
        background: 'rgba(249,115,22,0.06)',
      }}>{platform}</div>

      {/* Logo */}
      <div style={{
        position: 'absolute', top: 32, left: 44,
        opacity: subAlpha, transform: `translateY(${subTy}px)`,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width:0,height:0, borderTop:'8px solid transparent', borderBottom:'8px solid transparent', borderLeft:'16px solid #f97316' }}/>
        <span style={{ color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:800, letterSpacing:5, fontFamily:'Inter,system-ui,sans-serif' }}>AGENTS PILOT</span>
      </div>
    </AbsoluteFill>
  )
}

// ── Scene 2: Hook kinetics ──────────────────────────────────────────────────
function SceneHook({ hook, title }: { hook: string; title: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const text  = hook || title || 'STOP SCROLLING'
  const words = text.split(' ')

  return (
    <AbsoluteFill>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '0 56px',
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', alignItems: 'flex-end' }}>
          {words.map((w, i) => {
            const f     = frame - i * 10
            const s     = f > 0 ? sp(f, 0, fps, 600, 16) : 0
            const scale = interpolate(s, [0,1], [4,1])
            const alpha = clamp(s, 0, 1)
            const blur  = interpolate(s, [0,1], [22,0])
            const big   = i % 4 === 0
            const acc   = i % 3 === 1
            return (
              <span key={i} style={{
                display: 'inline-block',
                fontSize: big ? 96 : acc ? 68 : 56,
                fontWeight: 900, letterSpacing: '-3px', lineHeight: 1,
                fontFamily: 'Inter, system-ui, sans-serif',
                color: acc ? '#f97316' : '#fff',
                textShadow: acc
                  ? '0 0 40px #f97316, 0 0 80px rgba(249,115,22,0.3)'
                  : '0 2px 24px rgba(0,0,0,0.95)',
                transform: `scale(${scale})`,
                opacity: alpha, filter: `blur(${blur}px)`,
                transformOrigin: 'left center',
              }}>{w}</span>
            )
          })}
        </div>
      </div>

      {/* Animated underline */}
      <div style={{
        position: 'absolute', bottom: 88, left: 56,
        height: 3, borderRadius: 2,
        width: ip(frame, 0, 900, 30, 75),
        background: 'linear-gradient(90deg,#f97316,rgba(249,115,22,0.1))',
        boxShadow: '0 0 14px #f97316',
      }}/>
    </AbsoluteFill>
  )
}

// ── Scene 3: Content reveal ─────────────────────────────────────────────────
function SceneContent({ caption }: { caption: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const lines = caption
    .split(/[\n.!?]/).map(l => l.trim()).filter(l => l.length > 3).slice(0, 4)

  const ACCENTS = ['#f97316','#fb923c','#38bdf8','#a78bfa']

  return (
    <AbsoluteFill>
      {/* Section eyebrow */}
      <div style={{
        position: 'absolute', top: 52, left: 56,
        opacity: ip(frame, 0, 1, 0, 14),
        transform: `translateY(${ip(frame, -14, 0, 0, 14)}px)`,
        color: '#f97316', fontSize: 10, fontWeight: 800,
        letterSpacing: 6, textTransform: 'uppercase',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>Key Insights</div>

      {/* Vertical rail */}
      <div style={{
        position: 'absolute', left: 68, top: 80,
        width: 2, borderRadius: 2,
        height: ip(frame, 0, lines.length * 92, 4, 55),
        background: 'linear-gradient(to bottom,#f97316,transparent)',
        boxShadow: '0 0 8px #f97316',
      }}/>

      {lines.map((line, i) => {
        const acc = ACCENTS[i % ACCENTS.length]
        const f   = frame - i * 13
        const s   = f > 0 ? sp(f, 0, fps, 220, 26) : 0
        const tx  = interpolate(s, [0,1], [i%2===0 ? -130 : 130, 0])
        const al  = clamp(s, 0, 1)
        return (
          <div key={i} style={{
            position: 'absolute', left: 56, right: 56,
            top: 88 + i * 92,
            transform: `translateX(${tx}px)`, opacity: al,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            {/* Number badge */}
            <div style={{
              width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
              border: `2px solid ${acc}`, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              color: acc, fontSize: 13, fontWeight: 900,
              fontFamily: 'Inter, system-ui, sans-serif',
              boxShadow: `0 0 12px ${acc}88`,
              background: `${acc}18`,
            }}>{i+1}</div>
            <div style={{
              width: 3, height: 28, borderRadius: 2,
              background: acc, flexShrink: 0,
              boxShadow: `0 0 8px ${acc}`,
            }}/>
            <span style={{
              color: '#f1f5f9', fontSize: 21, fontWeight: 600,
              fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.35,
            }}>{line.length > 70 ? line.slice(0,70)+'…' : line}</span>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

// ── Scene 4: Brand finale ───────────────────────────────────────────────────
function SceneBrand({ hashtags, platform }: { hashtags: string; platform: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const tags = hashtags.split(/\s+/).filter(t => t.startsWith('#')).slice(0, 6)

  // Logo slam
  const s      = sp(frame, 0, fps, 600, 14)
  const lScale = interpolate(s, [0,1], [5,1])
  const lAlpha = clamp(s, 0, 1)

  // CTA
  const ctaS  = sp(frame, 22, fps, 280, 24)
  const ctaTy = interpolate(clamp(ctaS,0,1), [0,1], [28,0])

  // Frame border inset zooms in
  const inset = ip(frame, 70, 6, 0, 28)

  // Pulse ring
  const ringPhase = (frame % 40) / 40
  const ringScale = 1 + ringPhase * 2
  const ringAlpha = (1 - ringPhase) * 0.45

  return (
    <AbsoluteFill>
      {/* Animated neon frame */}
      <div style={{
        position: 'absolute', inset,
        border: `1.5px solid rgba(249,115,22,${ip(frame, 0, 0.6, 0, 30)})`,
        borderRadius: 10,
        boxShadow: '0 0 30px rgba(249,115,22,0.12), inset 0 0 30px rgba(249,115,22,0.04)',
        pointerEvents: 'none',
      }}/>

      {/* Corner brackets */}
      {([[0,0],[1,0],[0,1],[1,1]] as [number,number][]).map(([cx,cy],i) => {
        const edgeInset = inset + 10
        return (
          <div key={i} style={{
            position: 'absolute',
            [cy===0?'top':'bottom']: edgeInset,
            [cx===0?'left':'right']: edgeInset,
            width: 22, height: 22,
            borderTop:    cy===0 ? '2.5px solid #f97316' : 'none',
            borderBottom: cy===1 ? '2.5px solid #f97316' : 'none',
            borderLeft:   cx===0 ? '2.5px solid #f97316' : 'none',
            borderRight:  cx===1 ? '2.5px solid #f97316' : 'none',
            opacity: ip(frame, 0, 1, 5, 30),
            boxShadow: '0 0 8px #f97316',
          }}/>
        )
      })}

      {/* Pulse ring */}
      <div style={{
        position: 'absolute', top: '42%', left: '50%',
        width: 96 * ringScale, height: 96 * ringScale,
        borderRadius: '50%', border: '1.5px solid #f97316',
        transform: 'translate(-50%,-50%)',
        opacity: ringAlpha, pointerEvents: 'none',
      }}/>

      {/* Logo mark */}
      <div style={{
        position: 'absolute', top: '42%', left: '50%',
        transform: `translate(-50%,-50%) scale(${lScale})`,
        opacity: lAlpha, textAlign: 'center',
      }}>
        <div style={{
          width: 68, height: 68, margin: '0 auto',
          background: 'linear-gradient(135deg,#f97316,#ea580c)',
          borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 40px rgba(249,115,22,0.75)',
          fontSize: 24, fontWeight: 900, color: '#000',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}>▶</div>
        <div style={{
          marginTop: 12, color: '#fff', fontSize: 13, fontWeight: 800,
          letterSpacing: 5, fontFamily: 'Inter, system-ui, sans-serif',
        }}>AGENTS PILOT</div>
      </div>

      {/* CTA */}
      <div style={{
        position: 'absolute', bottom: 120, left: 0, right: 0,
        textAlign: 'center',
        transform: `translateY(${ctaTy}px)`,
        opacity: clamp(ctaS, 0, 1),
      }}>
        <span style={{
          color: '#f97316', fontSize: 20, fontWeight: 800,
          fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: 1,
          textShadow: '0 0 24px #f97316',
        }}>Follow for daily insights ↗</span>
      </div>

      {/* Hashtag chips */}
      {tags.map((tag, i) => {
        const f  = frame - 28 - i * 8
        if (f < 0) return null
        const s2 = sp(f, 0, fps, 320, 22)
        const tx = interpolate(clamp(s2,0,1), [0,1], [-180,0])
        const row = Math.floor(i / 3)
        const col = i % 3
        return (
          <div key={tag} style={{
            position: 'absolute',
            bottom: 44 + row * 36, left: 56 + col * 200,
            transform: `translateX(${tx}px)`,
            opacity: clamp(s2, 0, 1),
            background: 'rgba(249,115,22,0.10)',
            border: '1px solid rgba(249,115,22,0.35)',
            borderRadius: 20, padding: '4px 14px',
            color: '#fb923c', fontSize: 12, fontWeight: 700,
            fontFamily: 'Inter, system-ui, sans-serif',
            whiteSpace: 'nowrap',
          }}>{tag}</div>
        )
      })}

      {/* Platform */}
      <div style={{
        position: 'absolute', top: inset + 16, right: inset + 20,
        color: '#f97316', fontSize: 10, fontWeight: 800, letterSpacing: 4,
        textTransform: 'uppercase', fontFamily: 'Inter, system-ui, sans-serif',
        opacity: ip(frame, 0, 1, 8, 28),
      }}>{platform}</div>
    </AbsoluteFill>
  )
}

// ── Main composition ─────────────────────────────────────────────────────────

export function PostVideoComposition({ title, hook, caption, platform, hashtags, aiPrompt }: PostVideoProps) {
  const pal = parseVideoPalette(aiPrompt ?? '')
  return (
    <AbsoluteFill>
      <CinematicBg pal={pal} />

      <Sequence from={0} durationInFrames={82}>
        <SceneReveal title={title} hook={hook} platform={platform} />
      </Sequence>

      <ImpactFlash at={78} duration={5} />

      <Sequence from={82} durationInFrames={88}>
        <SceneHook hook={hook} title={title} />
      </Sequence>

      <ImpactFlash at={166} duration={5} />

      <Sequence from={170} durationInFrames={65}>
        <SceneContent caption={caption} />
      </Sequence>

      <ImpactFlash at={231} duration={4} />

      <Sequence from={234} durationInFrames={66}>
        <SceneBrand hashtags={hashtags} platform={platform} />
      </Sequence>
    </AbsoluteFill>
  )
}
