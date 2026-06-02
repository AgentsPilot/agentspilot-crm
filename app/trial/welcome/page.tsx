'use client'

import { useEffect, useState } from 'react'
import { useSearchParams }      from 'next/navigation'

const PRODUCT_URL     = process.env.NEXT_PUBLIC_PRODUCT_URL || 'https://app.agentspilot.com'
const REDIRECT_AFTER  = 8   // seconds before auto-redirect

export default function TrialWelcomePage() {
  const params   = useSearchParams()
  const name     = params.get('name')    || 'there'
  const expires  = params.get('expires') || ''

  const [countdown, setCountdown] = useState(REDIRECT_AFTER)
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    if (countdown <= 0) {
      setRedirected(true)
      window.location.href = PRODUCT_URL
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-12">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <polygon points="4,2 20,12 4,22" fill="#f97316"/>
          </svg>
          <span className="text-white font-bold text-base tracking-widest">
            AGENTS <span className="text-orange-500">PILOT</span>
          </span>
        </div>

        {/* Success icon */}
        <div className="w-20 h-20 rounded-full bg-orange-500/10 border border-orange-500/30
                        flex items-center justify-center mx-auto mb-8">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"
               strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold text-white mb-3 leading-tight">
          You&apos;re in,{' '}
          <span className="text-orange-500">{name}!</span>
        </h1>
        <p className="text-zinc-400 text-lg mb-2">
          Your 14-day free trial is now active.
        </p>
        {expires && (
          <p className="text-zinc-500 text-sm mb-8">
            Trial ends <span className="text-zinc-300">{expires}</span> — no credit card needed.
          </p>
        )}

        {/* Steps */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 mb-8 text-left">
          <p className="text-white font-semibold text-sm mb-4">What happens next:</p>
          <div className="space-y-3">
            {[
              { step: 1, text: 'Check your inbox — welcome email is on its way' },
              { step: 2, text: 'Log in and add your first contact or lead' },
              { step: 3, text: 'Set up lifecycle automation in under 5 minutes' },
            ].map(({ step, text }) => (
              <div key={step} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs
                                 font-bold flex items-center justify-center shrink-0">
                  {step}
                </span>
                <span className="text-zinc-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA + countdown */}
        <a
          href={PRODUCT_URL}
          className="inline-block bg-orange-500 hover:bg-orange-400 transition-colors
                     text-white font-bold text-base px-10 py-4 rounded-xl mb-6"
        >
          Open AgentsPilot →
        </a>

        <p className="text-zinc-600 text-sm">
          {redirected
            ? 'Redirecting…'
            : <>Redirecting automatically in <span className="text-zinc-400 font-mono">{countdown}s</span></>
          }
        </p>

      </div>
    </div>
  )
}
