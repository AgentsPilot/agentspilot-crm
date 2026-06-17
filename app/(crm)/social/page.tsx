'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, Calendar, LayoutGrid, PenSquare, Globe, ChevronLeft, ChevronRight, Pencil, Check, Sparkles, RefreshCw, BookOpen, Bell, Link2, Copy, CheckCheck, ListChecks, ImageIcon, ExternalLink, Upload, Eye, Hash, Film, Trash2 } from 'lucide-react'
import { PostTrackerTable } from '@/app/(crm)/post-tracker/page'
import type { PostVideoProps } from '@/components/social/PostVideoComposition'
import type { ProductDemoProps } from '@/components/social/ProductDemoComposition'
import type { AiMovieProps } from '@/components/social/AiMovieComposition'
import { AI_MOVIE_FRAMES } from '@/components/social/AiMovieComposition'

const Player = dynamic(() => import('@remotion/player').then(m => m.Player), { ssr: false })
const PostVideoComposition = dynamic(
  () => import('@/components/social/PostVideoComposition').then(m => m.PostVideoComposition),
  { ssr: false },
) as React.ComponentType<PostVideoProps>
const ProductDemoComposition = dynamic(
  () => import('@/components/social/ProductDemoComposition').then(m => m.ProductDemoComposition),
  { ssr: false },
) as React.ComponentType<ProductDemoProps>
const AiMovieComposition = dynamic(
  () => import('@/components/social/AiMovieComposition').then(m => m.AiMovieComposition),
  { ssr: false },
) as React.ComponentType<AiMovieProps>

// ── Types ──────────────────────────────────────────────────────────────────
type SocialPost = {
  id: string
  collateral: string
  platforms: string
  background: string
  media_type: string
  cta: string
  caption: string
  scheduled_date: string | null
  status: 'draft' | 'scheduled' | 'published'
  campaign_id: string | null
  created_at: string
}

type Campaign = {
  id: string
  name: string
  status: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
}

type PostTemplate = {
  id: string
  title: string
  platforms: string
  media_type: string
  background: string
  cta: string
  caption: string
  sort_order: number
  active: boolean
  design_url: string | null
  design_preview_url: string | null
  design_prompt: string | null
  logo_url: string | null
  infographic_url: string | null
  infographic_preview_url: string | null
  movie_url: string | null
  movie_preview_url: string | null
}

type TabId = 'calendar' | 'platform' | 'create' | 'tracker'

type SocialConnection = {
  id: string
  platform: string
  platform_username: string
  expires_at: string | null
}

// ── Template helpers (DB-driven, replaces hardcoded array) ────────────────

// ── OLD hardcoded array kept as fallback seed (used only if DB is empty) ──
const FALLBACK_TEMPLATES = [
  {
    collateral: 'Teaser Post #1',
    platforms: 'LinkedIn, Facebook, Instagram, TikTok',
    media_type: 'Short Video (15–30s)',
    cta: '👉 Follow to see how recurring work gets handled',
    background: 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way to handle it is coming ✨',
    caption: 'The same operational work. Every single day. Emails. Follow-ups. Updates. Tracking. ✨ A different way is coming ✨ 👉 Follow to see how recurring work gets handled',
  },
  {
    collateral: 'Teaser Post #2 — Pain Question',
    platforms: 'LinkedIn, Facebook, Instagram',
    media_type: 'Short Video',
    cta: '👉 Vote & follow to see what\'s coming',
    background: 'What\'s the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨',
    caption: "What's the recurring work that takes your time every day? Emails. Follow-ups. Status checks. ✨ Something new is coming ✨ 👉 Vote & follow",
  },
  {
    collateral: 'Comparison Post (Core)',
    platforms: 'LinkedIn, Instagram',
    media_type: 'Static / Video split screen',
    cta: '👉 Follow to see the difference',
    background: 'Automation sounds easy — until you have to run it. Other solutions: workflows, rules, maintenance. AgentsPilot: recurring work, fully managed, finished outcomes.',
    caption: "Automation sounds easy — until you have to run it.\nOther solutions: workflows, rules, maintenance\nAgentsPilot: fully managed, finished outcomes\nAutomation adds responsibility. AgentsPilot removes it.",
  },
  {
    collateral: 'Value Post — Time & Money',
    platforms: 'LinkedIn',
    media_type: 'Static clean post',
    cta: '👉 Learn how it works',
    background: 'Small business managers spend hours on the same operational work every day. Not strategic — just constant. AgentsPilot removes it entirely.',
    caption: 'The same work. Every day. Not complex — just constant.\nAgentsPilot handles it for you. No setup. Just results.',
  },
  {
    collateral: 'Use Case — Expenses',
    platforms: 'LinkedIn, Instagram',
    media_type: 'Demo / Static',
    cta: '👉 See how it works',
    background: 'Expense tracking is recurring work. Receipts, invoices, updates — every month. AgentsPilot handles it and delivers the finished result.',
    caption: 'Expense tracking is recurring work.\nAgentsPilot handles it for you. No manual entry. No management. Just handled.',
  },
  {
    collateral: 'Engagement Post — Question',
    platforms: 'LinkedIn',
    media_type: 'Text-only or poll',
    cta: '👉 Comment or vote',
    background: "Be honest — what's the one task you repeat every day? If it shows up every day, it shouldn't be your job to manage it.",
    caption: "What's the one task you repeat every day?\nIt shouldn't be your job to manage it.",
  },
  {
    collateral: 'Reveal Post (Later Stage)',
    platforms: 'LinkedIn, Website',
    media_type: 'Video / Hero',
    cta: '👉 Request a demo',
    background: "Managed Recurring Operations Assistance. We don't automate tasks. We deliver outcomes.",
    caption: "Managed Recurring Operations Assistance\nWe don't automate tasks. We deliver outcomes.",
  },
]

// ── End fallback templates ─────────────────────────────────────────────────

const ALL_PLATFORMS = ['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Website', 'Other']

const platformIcon: Record<string, React.ReactNode> = {
  LinkedIn: <span className="text-xs font-bold">in</span>,
  Facebook: <span className="text-xs font-bold">f</span>,
  Instagram: <span className="text-xs font-bold">ig</span>,
  TikTok: <span className="text-xs font-bold">tk</span>,
  Website: <Globe className="h-4 w-4" />,
  Other: <Globe className="h-4 w-4" />,
}

const platformColor: Record<string, string> = {
  LinkedIn: 'bg-blue-600',
  Facebook: 'bg-indigo-600',
  Instagram: 'bg-pink-500',
  TikTok: 'bg-slate-900',
  Website: 'bg-orange-500',
  Other: 'bg-gray-400',
}

const statusColor = {
  draft: 'bg-gray-100 text-gray-600',
  scheduled: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
}

const PIPELINE_STAGES = ['Contacted', 'Qualified', 'Proposal Sent', 'Won']

// ── Hashtag suggestions ────────────────────────────────────────────────────
const HASHTAG_GROUPS: Record<string, string[]> = {
  'Real Estate':  ['#realestate','#realtor','#realtorlife','#property'],
  'Lead Gen':     ['#leadgeneration','#salesfunnel','#crm','#prospecting'],
  'Marketing':    ['#realestatemarketing','#contentmarketing','#digitalmarketing'],
  'Investment':   ['#realestateinvesting','#propertyinvestment','#roi'],
  'Buyers':       ['#homebuyer','#firsttimehomebuyer','#dreamhome'],
  'Sellers':      ['#homeseller','#justlisted','#newlisting'],
  'PropTech':     ['#proptech','#realestatetech','#realestatetechnology'],
}

const KEYWORD_HASHTAGS: [RegExp, string[]][] = [
  [/real\s*estate|realt/i,   ['#realestate','#realtor','#realtorlife']],
  [/listing|just\s*listed/i, ['#newlisting','#justlisted','#homeforsale']],
  [/invest/i,                ['#realestateinvesting','#propertyinvestment']],
  [/buyer|purchas/i,         ['#homebuyer','#firsttimehomebuyer']],
  [/seller|selling/i,        ['#homeseller','#sellingtips']],
  [/mortgage|loan/i,         ['#mortgage','#homeloan']],
  [/lead/i,                  ['#leadgeneration','#salesfunnel']],
  [/crm|pipeline|funnel/i,   ['#crm','#proptech','#realestatetech']],
  [/luxury/i,                ['#luxuryrealestate','#luxuryhomes']],
  [/commercial/i,            ['#commercialrealestate','#cre']],
  [/tip|advice|guide|how/i,  ['#realestatetips','#realestateadvice']],
]

function suggestHashtags(title: string, caption: string, platforms: string[]): string {
  const text = `${title} ${caption}`
  const found = new Set<string>()
  for (const [pattern, tags] of KEYWORD_HASHTAGS) {
    if (pattern.test(text)) tags.forEach(t => found.add(t))
  }
  if (found.size < 3) {
    ['#realestate','#realtor','#realtorlife'].forEach(t => found.add(t))
  }
  if (platforms.includes('LinkedIn')) {
    ['#linkedin','#realestate'].forEach(t => found.add(t))
  }
  const limit = platforms.includes('Instagram') ? 10 : 5
  return [...found].slice(0, limit).join(' ')
}

const emptyForm = {
  collateral: '',
  platforms: [] as string[],
  background: '',
  media_type: '',
  cta: '',
  hook: '',
  caption: '',
  hashtags: '',
  scheduled_date: '',
  status: 'draft' as SocialPost['status'],
  campaign_id: '',
  // Nurture library
  add_to_library: false,
  library_stages: [] as string[],
}

// ── Month helpers ──────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── UTM Link Box ───────────────────────────────────────────────────────────
function UtmLinkBox({ link }: { link: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Link2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <span className="text-xs font-semibold text-blue-700">UTM Link — paste this in your post</span>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs text-blue-800 bg-white border border-blue-200 rounded-lg px-3 py-2 truncate">
          {link}
        </code>
        <button
          type="button"
          onClick={copy}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {copied ? <><CheckCheck className="h-3.5 w-3.5" /> Copied!</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
        </button>
      </div>
      <p className="text-xs text-blue-500">
        When someone clicks this link → their source is tracked in your CRM automatically
      </p>
    </div>
  )
}

// ── Visual palette system ──────────────────────────────────────────────────
type SvgPalette = {
  bg1: string; bg2: string; bg3: string
  accent: string; accentAlt: string
  textMain: string; textSub: string; textAccent: string
  gridStroke: string; slashOpacity: number
  rowAccents: readonly string[]
}

const SVG_PALETTES: Record<string, SvgPalette> = {
  brand: {
    bg1: '#060608', bg2: '#0e0a00', bg3: '#0a0010',
    accent: '#f97316', accentAlt: '#fb923c',
    textMain: 'white', textSub: '#9ca3af', textAccent: '#f97316',
    gridStroke: '#f97316', slashOpacity: 0.08,
    rowAccents: ['#f97316','#fb923c','#f59e0b','#10b981','#6366f1'],
  },
  crimson: {
    bg1: '#0e0202', bg2: '#1a0808', bg3: '#1a0510',
    accent: '#ef4444', accentAlt: '#f97316',
    textMain: 'white', textSub: '#fca5a5', textAccent: '#fca5a5',
    gridStroke: '#ef4444', slashOpacity: 0.10,
    rowAccents: ['#ef4444','#dc2626','#f97316','#b91c1c','#fb923c'],
  },
  electric: {
    bg1: '#030815', bg2: '#0a0f2e', bg3: '#051020',
    accent: '#3b82f6', accentAlt: '#60a5fa',
    textMain: 'white', textSub: '#93c5fd', textAccent: '#60a5fa',
    gridStroke: '#3b82f6', slashOpacity: 0.06,
    rowAccents: ['#3b82f6','#6366f1','#8b5cf6','#06b6d4','#0ea5e9'],
  },
  emerald: {
    bg1: '#031908', bg2: '#0d2b10', bg3: '#052014',
    accent: '#10b981', accentAlt: '#34d399',
    textMain: 'white', textSub: '#6ee7b7', textAccent: '#34d399',
    gridStroke: '#10b981', slashOpacity: 0.07,
    rowAccents: ['#10b981','#34d399','#f97316','#06b6d4','#84cc16'],
  },
  premium: {
    bg1: '#0c0818', bg2: '#1a0a2e', bg3: '#0e0a20',
    accent: '#f59e0b', accentAlt: '#a855f7',
    textMain: 'white', textSub: '#d8b4fe', textAccent: '#fbbf24',
    gridStroke: '#f59e0b', slashOpacity: 0.06,
    rowAccents: ['#f59e0b','#a855f7','#ec4899','#f97316','#38bdf8'],
  },
  warm: {
    bg1: '#1a0e06', bg2: '#2d1a0a', bg3: '#1e1206',
    accent: '#f59e0b', accentAlt: '#fb923c',
    textMain: 'white', textSub: '#fcd34d', textAccent: '#fbbf24',
    gridStroke: '#f59e0b', slashOpacity: 0.09,
    rowAccents: ['#f59e0b','#fb923c','#f97316','#fbbf24','#d97706'],
  },
  slate: {
    bg1: '#0a0c10', bg2: '#131720', bg3: '#0c1018',
    accent: '#e2e8f0', accentAlt: '#94a3b8',
    textMain: 'white', textSub: '#94a3b8', textAccent: '#e2e8f0',
    gridStroke: '#64748b', slashOpacity: 0.05,
    rowAccents: ['#e2e8f0','#94a3b8','#f97316','#3b82f6','#10b981'],
  },
}

function parsePalette(prompt: string): SvgPalette {
  const p = prompt.toLowerCase()
  if (/chaos|overwhelm|frustrat|pain|clutter|mess|anger|broken|crack|scatter|warning|tangl/.test(p)) return SVG_PALETTES.crimson
  if (/electric|circuit|tech|data|digital|neon|cyber|stream|flow|matrix|code|fintech|futur/.test(p)) return SVG_PALETTES.electric
  if (/growth|success|result|win|triumph|emerge|bloom|rise|green|outcome/.test(p)) return SVG_PALETTES.emerald
  if (/launch|reveal|premium|luxury|purple|spotlight|drama|smoke|cinematic|product/.test(p)) return SVG_PALETTES.premium
  if (/warm|human|question|poll|personal|story|amber|gold|approachab/.test(p)) return SVG_PALETTES.warm
  if (/minimal|clean|white|simple|clear|clarity|monochrome|neutral|slate/.test(p)) return SVG_PALETTES.slate
  return SVG_PALETTES.brand
}

// ── AI visual prompt auto-generator (content-aware, no API cost) ──────────
function suggestVisualPrompt(title: string, caption: string, background: string): string {
  const text = `${title} ${caption} ${background}`.toLowerCase()

  if (/chaos|clutter|mess|overwhelm|frustrat|stress|overload|manual|tedious|repetit|same.*every.*day|every.*day/.test(text))
    return 'Cinematic overhead shot: chaotic business desk drowning in sticky notes, blinking email alerts, overflowing inbox, dozens of overlapping task notifications. Dramatic orange-red spotlight cutting through the clutter from above. Deep dark crimson background. Mood: overwhelmed — but change is coming. Ultra-modern B2B editorial feel.'

  if (/compar|before.*after|vs\b|versus|other.*tool|different|split|contrast|two.*world/.test(text))
    return 'Sharp split-screen editorial. LEFT: dark crimson chaos — tangled cables, broken gears, overlapping sticky notes, warning triangles, blurred motion suggesting frustration. RIGHT: clean electric scene — a single smooth glowing orange circuit path on crisp white space, order and calm. A razor-sharp diagonal divides both worlds. Professional B2B editorial.'

  if (/time|hour|minute|money|cost|save|roi|invest|spend|wast|drain/.test(text))
    return 'Cinematic close-up of an hourglass where sand flows into a pile of scattered receipts, to-do lists, and overflowing calendar events. Deep navy background. Warm amber cinematic lighting. Time and money literally draining away. Premium data-visualization aesthetic. Dramatic and urgent.'

  if (/expens|invoice|receipt|financ|account|budget|bill/.test(text))
    return 'Futuristic finance scene: stacks of receipts and invoices dissolving into clean digital streams flowing into a bright glowing processing node. Electric green data streams on deep charcoal background. Business intelligence aesthetic — precision, automation, control. Clean and professional.'

  if (/data|flow|automat|digital|tech|circuit|stream|process|system|ai|agent/.test(text))
    return 'Futuristic data flow visualization: streams of business task icons converging elegantly into a central glowing orange node processor. Electric blue and white streams on deep dark navy background. Business intelligence fintech aesthetic — clean, controlled, electric circuit art. Ultra-modern editorial.'

  if (/question|\?|poll|vote|what is|how do|which|opinion|comment|honest/.test(text))
    return 'Bold minimal warm composition: dark amber-charcoal background. A single enormous glowing question mark centered in frame, surrounded by tiny orbiting business icons (email, calendar, phone, spreadsheet). Premium editorial typography feel. Human, approachable, thought-provoking.'

  if (/reveal|launch|introduc|present|announc|new product|debut|release|coming/.test(text))
    return 'Dramatic product launch cinematic: dark studio room with a single spotlight illuminating a glowing screen. Deep purple and charcoal background. Orange and violet light rays emanate outward. Premium smoke and floating particle effects. Explosive brand emergence. Theatrical and premium.'

  if (/grow|result|win|success|outcome|achiev|deliver|done|complet|finish|managed/.test(text))
    return 'Dramatic growth visualization: a single glowing green upward trajectory line cuts through a dark background, leaving a luminous trail. Smaller stagnating lines fade below it. Deep forest green accent light on dark charcoal. Premium editorial business aesthetic. Victory, clarity, momentum.'

  if (/teas|coming soon|follow|sneak|hint|something new|watch|stay/.test(text))
    return 'Atmospheric teaser composition: deep dark background with a single orange glowing horizon line barely visible at the edge. Dramatic fog and light rays reaching upward. Suspense and anticipation. Cinematic wide-angle editorial. Abstract energy — something powerful is about to emerge.'

  // Generic AgentsPilot default
  return 'Abstract cinematic composition: glowing orange geometric threads forming an infinity loop on deep charcoal background. Warm center key light with cool blue counter-light. Subtle particle field orbiting the center. Premium editorial feel — clean power, modern authority, business transformation energy. Ultra-modern B2B.'
}

// ── Movie hook extractor — title first, then punchy line from content ────────
function extractMovieHook(title: string, background: string, caption: string): string {
  // Template title is usually the clearest hook
  if (title && title.length >= 6 && title.length <= 55) return title
  const source = background || caption || ''
  const sentences = source.split(/[.!?\n]+/).map(s => s.trim()).filter(s => s.length >= 8)
  const punchy = sentences.find(s => s.length <= 55) ?? sentences[0] ?? title ?? ''
  return punchy
}

function extractMovieHashtags(title: string, caption: string, background: string): string {
  return suggestHashtags(title, caption, ['LinkedIn']).split(' ').slice(0, 4).join(' ')
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function SocialPage() {
  const [posts, setPosts]           = useState<SocialPost[]>([])
  const [campaigns, setCampaigns]   = useState<Campaign[]>([])
  const [loading, setLoading]       = useState(true)
  const [activeTab, setActiveTab]   = useState<TabId>('calendar')
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [editingPost, setEditingPost] = useState<SocialPost | null>(null)
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [publishing, setPublishing] = useState<string | null>(null)
  const [publishResults, setPublishResults] = useState<Record<string, { success: boolean; message: string }> | null>(null)
  const [useAI, setUseAI] = useState(false)
  const [aiBrief, setAiBrief] = useState('')
  const [aiPlatform, setAiPlatform] = useState('LinkedIn')
  const [aiTone, setAiTone] = useState('Professional')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  // Hook picker
  const [showHookPicker, setShowHookPicker] = useState(false)
  const [hookPickerItems, setHookPickerItems] = useState<{ id: string; text: string; category: string; platform: string; avg_score: number; tags: string[]; usage_count: number }[]>([])
  const [hookPickerSearch, setHookPickerSearch] = useState('')
  const [hookPickerLoading, setHookPickerLoading] = useState(false)

  async function openHookPicker() {
    setShowHookPicker(true)
    if (hookPickerItems.length > 0) return
    setHookPickerLoading(true)
    const { data } = await supabase.from('hooks_library').select('id,text,category,platform,avg_score,tags,usage_count').order('avg_score', { ascending: false })
    setHookPickerItems(data ?? [])
    setHookPickerLoading(false)
  }

  // Manual LinkedIn setup
  // ── DB templates state ──────────────────────────────────────────────────
  const [dbTemplates, setDbTemplates] = useState<PostTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    title: '', platforms: '', media_type: '', background: '', cta: '', caption: '', sort_order: 0,
    design_url: '', design_preview_url: '', design_prompt: '', logo_url: '',
    infographic_url: '', infographic_preview_url: '',
    movie_url: '', movie_preview_url: '',
  })
  const [designUploading, setDesignUploading] = useState(false)
  const [cardDesignUploading, setCardDesignUploading] = useState<string | null>(null) // template title being uploaded
  const [claudeDesigning, setClaudeDesigning] = useState<string | null>(null) // template title being claude-designed
  const [movieTemplate, setMovieTemplate] = useState<typeof FALLBACK_TEMPLATES[0] | null>(null)
  const [designTab, setDesignTab] = useState<'image' | 'movie' | 'infographic' | null>(null)
  const [templateDesignGenerating, setTemplateDesignGenerating] = useState<string | null>(null)
  const [templateFields, setTemplateFields] = useState<Set<string>>(new Set())
  const [fluxGenerating, setFluxGenerating] = useState(false)
  const [claudeDesignPrompt, setClaudeDesignPrompt] = useState<string | null>(null)
  const [canvaTemplateUrl, setCanvaTemplateUrl] = useState('')
  const [infographicQueuing, setInfographicQueuing] = useState(false)
  const [movieGenerating, setMovieGenerating] = useState(false)
  const [movieMode, setMovieMode] = useState<'basic' | 'ai' | 'product' | 'upload'>('basic')
  const [movieUploading, setMovieUploading] = useState(false)
  const [productScreenshots, setProductScreenshots] = useState<string[]>([])
  const [productScreenshotUploading, setProductScreenshotUploading] = useState(false)
  const [movieQueuing, setMovieQueuing] = useState(false)
  const [aiMovieGenerating, setAiMovieGenerating] = useState(false)
  const [movieEditHook, setMovieEditHook] = useState('')
  const [movieEditCaption, setMovieEditCaption] = useState('')
  const [showCanvaPicker, setShowCanvaPicker] = useState(false)
  const [canvaDesigns, setCanvaDesigns] = useState<{ id: string; title: string; thumbnail: string; edit_url: string }[]>([])
  const [canvaSearchQuery, setCanvaSearchQuery] = useState('')
  // Canva AI generate flow
  const [canvaGenerating, setCanvaGenerating] = useState(false)
  const [canvaCandidates, setCanvaCandidates] = useState<{ candidate_id: string; url: string; thumbnail: string; job_id: string }[]>([])
  const [canvaConfirming, setCanvaConfirming] = useState<string | null>(null) // candidate_id being confirmed
  // Post preview modal
  const [showPostPreview, setShowPostPreview] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<{
    url?: string | null; design_url?: string | null
    infographic_preview_url?: string | null; infographic_url?: string | null
    movie_preview_url?: string | null; movie_url?: string | null
  } | null>(null)
  const [selectedMediaSlot, setSelectedMediaSlot] = useState<'image' | 'infographic' | 'movie'>('image')
  const [templateSaving, setTemplateSaving] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  // Use DB templates if loaded, fall back to hardcoded list
  type ActiveTemplate = typeof FALLBACK_TEMPLATES[0] & {
    design_url?: string | null
    design_preview_url?: string | null
    design_prompt?: string | null
    logo_url?: string | null
    infographic_url?: string | null
    infographic_preview_url?: string | null
    movie_url?: string | null
    movie_preview_url?: string | null
  }
  const activeTemplates: ActiveTemplate[] = dbTemplates.length > 0
    ? dbTemplates.filter(t => t.active).map(t => ({
        collateral: t.title, platforms: t.platforms, media_type: t.media_type,
        background: t.background, cta: t.cta, caption: t.caption,
        design_url: t.design_url, design_preview_url: t.design_preview_url, design_prompt: t.design_prompt, logo_url: t.logo_url,
        infographic_url: t.infographic_url, infographic_preview_url: t.infographic_preview_url,
        movie_url: t.movie_url, movie_preview_url: t.movie_preview_url,
      }))
    : FALLBACK_TEMPLATES

  const [showLinkedInManual, setShowLinkedInManual] = useState(false)
  const [liToken, setLiToken] = useState('')
  const [liName, setLiName] = useState('')
  const [liMemberId, setLiMemberId] = useState('')
  const [liSaving, setLiSaving] = useState(false)
  const [liDebug, setLiDebug] = useState<string | null>(null)
  const [liDetecting, setLiDetecting] = useState(false)

  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false)
  const [dayPickerDate, setDayPickerDate] = useState<string | null>(null)
  const [dayPickerSaving, setDayPickerSaving] = useState(false)
  const [showOverduePanel, setShowOverduePanel] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  async function fetchPosts() {
    setLoading(true)
    const { data } = await supabase
      .from('social_posts')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    setPosts(data ?? [])
    setLoading(false)
  }

  async function fetchConnections() {
    const { data } = await supabase.from('social_connections').select('*')
    setConnections(data ?? [])
  }

  async function fetchCampaigns() {
    const { data } = await supabase
      .from('campaigns')
      .select('id, name, status, utm_source, utm_medium, utm_campaign')
      .order('created_at', { ascending: false })
    setCampaigns(data ?? [])
  }

  async function fetchTemplates() {
    const { data, error } = await supabase
      .from('post_templates')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .range(0, 199)
    if (error) console.error('fetchTemplates error:', error)
    if (data) setDbTemplates(data)
  }

  async function fetchHooksForSuggestion() {
    if (hookPickerItems.length > 0) return
    const { data } = await supabase.from('hooks_library').select('id,text,category,platform,avg_score,tags,usage_count').order('avg_score', { ascending: false })
    setHookPickerItems(data ?? [])
  }

  function suggestHookForTitle(title: string, hooks: typeof hookPickerItems): string | null {
    if (hooks.length === 0) return null
    const words = title.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    let best = hooks[0]
    let bestScore = -1
    for (const h of hooks) {
      const tagMatch  = (h.tags ?? []).filter(t => words.some(w => t.includes(w) || w.includes(t))).length
      const textMatch = words.filter(w => h.text.toLowerCase().includes(w)).length
      const score     = tagMatch * 3 + textMatch * 2 + Number(h.avg_score) / 20
      if (score > bestScore) { bestScore = score; best = h }
    }
    return best.text
  }

  useEffect(() => {
    fetchPosts()
    fetchConnections()
    fetchCampaigns()
    fetchTemplates()
    fetchHooksForSuggestion()
    // Handle OAuth redirect params
    const params = new URLSearchParams(window.location.search)
    if (params.get('connected')) {
      setSuccess(`${params.get('connected')} connected successfully!`)
      window.history.replaceState({}, '', '/social')
      fetchConnections()
    }
    if (params.get('error')) {
      setError(`Connection failed: ${params.get('error')}`)
      window.history.replaceState({}, '', '/social')
    }
    if (params.get('canva_connected')) {
      setSuccess('Canva connected! Click "Generate in Canva" again to create your design.')
      window.history.replaceState({}, '', '/social')
    }
    if (params.get('canva_error')) {
      setError(`Canva OAuth failed: ${params.get('canva_error')}`)
      window.history.replaceState({}, '', '/social')
    }
    // Pre-fill campaign when coming from Campaigns page shortcut
    const campaignIdParam = params.get('campaign_id')
    const postIdParam     = params.get('post_id')
    if (postIdParam) {
      // Load existing post into edit form
      setActiveTab('create')
      supabase.from('social_posts').select('*').eq('id', postIdParam).single().then(({ data }) => {
        if (data) {
          setEditingPost(data)
          setForm({
            collateral:     data.collateral,
            platforms:      data.platforms.split(/,\s*/).map((p: string) => p.trim()).filter(Boolean),
            background:     data.background,
            media_type:     data.media_type,
            cta:            data.cta,
            caption:        data.caption,
            scheduled_date: data.scheduled_date ?? '',
            status:         data.status,
            campaign_id:    data.campaign_id ?? '',
            hook:           '',
            hashtags:       '',
            add_to_library: false,
            library_stages: [],
          })
        }
      })
      window.history.replaceState({}, '', '/social')
    } else if (campaignIdParam) {
      setForm(f => ({ ...f, campaign_id: campaignIdParam }))
      setActiveTab('create')
      window.history.replaceState({}, '', '/social')
    } else if (params.get('tab') === 'create') {
      setActiveTab('create')
      window.history.replaceState({}, '', '/social')
    }
  }, [])

  async function detectMemberId() {
    if (!liToken.trim()) return
    setLiDetecting(true)
    setLiDebug(null)
    try {
      const r = await fetch('/api/auth/linkedin/debug-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: liToken.trim() }),
      })
      const d = await r.json()
      setLiDebug(JSON.stringify(d.raw, null, 2))
      // Try to auto-fill if we find an ID
      const raw = d.raw
      const id = raw?.sub ?? raw?.id ?? raw?.memberId ?? raw?.member_id ?? null
      if (id) {
        setLiMemberId(String(id))
        setLiDebug(null)
      }
    } catch {
      setLiDebug('Failed to call debug endpoint')
    }
    setLiDetecting(false)
  }

  async function saveLinkedInManual() {
    if (!liToken.trim()) return
    setLiSaving(true)

    // Auto-resolve member ID if not provided
    let memberId = liMemberId.trim()
    let displayName = liName.trim()
    if (!memberId) {
      try {
        const r = await fetch('/api/auth/linkedin/resolve-urn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: liToken.trim() }),
        })
        const d = await r.json()
        if (d.memberId) {
          memberId = d.memberId
          if (!displayName && d.name) displayName = d.name
        } else if (d.error === 'MANUAL_ID_REQUIRED') {
          setError('Could not auto-detect Member ID — please paste it manually in the Member ID field')
          setLiSaving(false)
          return
        } else {
          setError(d.error ?? 'Could not resolve LinkedIn member ID')
          setLiSaving(false)
          return
        }
      } catch {
        setError('Failed to contact LinkedIn API')
        setLiSaving(false)
        return
      }
    }

    const { error: dbErr } = await supabase.from('social_connections').upsert(
      {
        platform: 'linkedin',
        access_token: liToken.trim(),
        expires_at: new Date(Date.now() + 5184000 * 1000).toISOString(),
        platform_user_id: `urn:li:person:${memberId}`,
        platform_username: displayName || 'LinkedIn',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'platform' }
    )
    setLiSaving(false)
    if (dbErr) { setError(dbErr.message); return }
    setSuccess('LinkedIn connected!')
    setShowLinkedInManual(false)
    setLiToken(''); setLiName(''); setLiMemberId('')
    fetchConnections()
  }

  async function publishPost(post: SocialPost) {
    setPublishing(post.id)
    setPublishResults(null)
    try {
      const res = await fetch('/api/social/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id: post.id }),
      })
      const data = await res.json()
      setPublishResults(data.results)
      fetchPosts()
    } catch {
      setError('Failed to publish post')
    }
    setPublishing(null)
  }

  function isConnected(platform: string) {
    return connections.some(c => c.platform === platform.toLowerCase())
  }

  function getConnection(platform: string) {
    return connections.find(c => c.platform === platform.toLowerCase())
  }

  function applyTemplate(t: typeof FALLBACK_TEMPLATES[0]) {
    const suggestedHook = suggestHookForTitle(t.collateral, hookPickerItems)
    setForm(f => {
      const LANDING = 'https://agentspilot-marketing.vercel.app/signup'
      let caption = t.caption
      if (f.campaign_id) {
        const camp = campaigns.find(c => c.id === f.campaign_id)
        if (camp?.utm_source) {
          const p = new URLSearchParams()
          p.set('utm_source', camp.utm_source)
          if (camp.utm_medium)   p.set('utm_medium',   camp.utm_medium)
          if (camp.utm_campaign) p.set('utm_campaign', camp.utm_campaign)
          caption = `${t.caption}\n${LANDING}?${p.toString()}`
        }
      }
      return {
        ...f,
        collateral: t.collateral,
        platforms: t.platforms.split(/,\s*/).map(p => p.trim()).filter(Boolean),
        background: t.background,
        media_type: t.media_type,
        cta: t.cta,
        caption,
        hook: suggestedHook ?? f.hook,
      }
    })
    setSelectedTemplate(t.collateral)
    const at = t as ActiveTemplate
    setSelectedDesign({
      url: at.design_preview_url, design_url: at.design_url,
      infographic_preview_url: at.infographic_preview_url, infographic_url: at.infographic_url,
      movie_preview_url: at.movie_preview_url, movie_url: at.movie_url,
    })
    setSelectedMediaSlot(at.design_preview_url ? 'image' : at.infographic_preview_url ? 'infographic' : 'movie')
    setTemplateFields(new Set(['collateral', 'platforms', 'background', 'media_type', 'cta', 'caption']))
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const hashtagSuffix = form.hashtags.trim() ? `\n\n${form.hashtags.trim()}` : ''
    const finalCaption = form.hook
      ? `${form.hook}\n\n${form.caption}${hashtagSuffix}`
      : `${form.caption}${hashtagSuffix}`
    const payload = {
      collateral: form.collateral,
      platforms: form.platforms.join(', '),
      background: form.background,
      media_type: form.media_type,
      cta: form.cta,
      caption: finalCaption,
      hook_text: form.hook || null,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
      campaign_id: form.campaign_id || null,
    }
    const { error } = editingPost
      ? await supabase.from('social_posts').update(payload).eq('id', editingPost.id)
      : await supabase.from('social_posts').insert([payload])
    setSaving(false)
    if (error) { setError(error.message); return }

    // ── Increment hook usage_count when hook is used ──────────────────────
    if (form.hook) {
      const matched = hookPickerItems.find(h => h.text === form.hook)
      if (matched) {
        await supabase.from('hooks_library')
          .update({ usage_count: matched.usage_count + 1 })
          .eq('id', matched.id)
        setHookPickerItems(prev => prev.map(h => h.id === matched.id ? { ...h, usage_count: h.usage_count + 1 } : h))
      }
    }

    // ── Also save to content_library if checkbox is checked ──────────────
    if (form.add_to_library && form.caption && form.library_stages.length > 0) {
      const contentType = form.media_type.toLowerCase().includes('video') ? 'post'
        : form.media_type.toLowerCase().includes('case') ? 'case_study'
        : form.cta ? 'value' : 'post'
      await supabase.from('content_library').insert({
        title:           form.collateral,
        body:            form.caption,
        type:            contentType,
        pipeline_stages: form.library_stages,
      })
    }

    setSuccess(editingPost ? 'Post updated!' : 'Post created!')
    setSaved(true)
    setForm(emptyForm)
    setSelectedTemplate(null)
    setEditingPost(null)
    fetchPosts()
    setTimeout(() => { setSuccess(null); setSaved(false) }, 3000)
  }

  async function deletePost(id: string) {
    await supabase.from('social_posts').delete().eq('id', id)
    fetchPosts()
  }

  async function updateStatus(id: string, status: SocialPost['status']) {
    await supabase.from('social_posts').update({ status }).eq('id', id)
    fetchPosts()
  }

  async function generateWithAI() {
    if (!aiBrief.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await fetch('/api/generate-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief: aiBrief,
          platform: aiPlatform,
          tone: aiTone,
          collateral: form.collateral,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate')
      setForm(f => ({
        ...f,
        caption: data.caption,
        cta: data.cta || f.cta,
        platforms: f.platforms.length > 0 ? f.platforms : [aiPlatform],
      }))
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Generation failed')
    }
    setAiLoading(false)
  }

  // ── Template CRUD ────────────────────────────────────────────────────────
  function openNewTemplate() {
    setEditingTemplate(null)
    setTemplateForm({ title: '', platforms: '', media_type: '', background: '', cta: '', caption: '', sort_order: dbTemplates.length + 1, design_url: '', design_preview_url: '', design_prompt: '', logo_url: '', infographic_url: '', infographic_preview_url: '', movie_url: '', movie_preview_url: '' })
    setShowTemplateForm(true)
  }

  function openEditTemplate(t: PostTemplate) {
    setEditingTemplate(t)
    setTemplateForm({ title: t.title, platforms: t.platforms, media_type: t.media_type, background: t.background, cta: t.cta, caption: t.caption, sort_order: t.sort_order, design_url: t.design_url ?? '', design_preview_url: t.design_preview_url ?? '', design_prompt: t.design_prompt ?? '', logo_url: t.logo_url ?? '', infographic_url: t.infographic_url ?? '', infographic_preview_url: t.infographic_preview_url ?? '', movie_url: t.movie_url ?? '', movie_preview_url: t.movie_preview_url ?? '' })
    setShowTemplateForm(true)
  }

  async function uploadDesignImage(file: File) {
    setDesignUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
    if (error || !data) { setDesignUploading(false); return null }
    const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)
    setDesignUploading(false)
    return publicUrl
  }

  async function uploadCardDesign(templateTitle: string, file: File) {
    // Find matching DB template by title
    const dbT = dbTemplates.find(t => t.title === templateTitle)
    if (!dbT) return
    setCardDesignUploading(templateTitle)
    const ext = file.name.split('.').pop()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { data, error } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
    if (error || !data) { setCardDesignUploading(null); return }
    const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)
    await supabase.from('post_templates').update({ design_preview_url: publicUrl }).eq('id', dbT.id)
    setCardDesignUploading(null)
    fetchTemplates()
  }

  function buildPostSVG(title: string, hook: string, caption: string, platform: string, hashtags: string, aiPrompt?: string): string {
    const esc   = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s
    const pal   = parsePalette(aiPrompt ?? '')

    const headline  = hook || title || 'Your Post'
    const headA     = trunc(headline, 22)
    const headB     = headline.length > 22 ? trunc(headline.slice(22), 22) : ''
    const headC     = headline.length > 44 ? trunc(headline.slice(44), 22) : ''
    const body      = trunc(caption.replace(/\n/g,' '), 120)
    const tags      = hashtags.split(/\s+/).filter(t=>t.startsWith('#')).slice(0,5)
    const plat      = platform || 'LinkedIn'

    // Split body into two wrapped lines
    const bodyWords = body.split(' ')
    const bodyLine1 = bodyWords.slice(0, Math.ceil(bodyWords.length / 2)).join(' ')
    const bodyLine2 = bodyWords.slice(Math.ceil(bodyWords.length / 2)).join(' ')

    const headY1    = title && hook ? 220 : 200
    const headY2    = headY1 + 72
    const headY3    = headY2 + 72

    return `<svg viewBox="0 0 1200 628" width="1200" height="628" xmlns="http://www.w3.org/2000/svg" font-family="Inter,system-ui,sans-serif">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pal.bg1}"/>
      <stop offset="60%" stop-color="${pal.bg2}"/>
      <stop offset="100%" stop-color="${pal.bg3}"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${pal.accent}"/>
      <stop offset="100%" stop-color="${pal.accentAlt}"/>
    </linearGradient>
    <radialGradient id="glow" cx="25%" cy="50%" r="55%">
      <stop offset="0%" stop-color="${pal.accent}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="0"/>
    </radialGradient>
    <filter id="blur4"><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="blur12"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="628" fill="url(#bg)"/>
  <rect width="1200" height="628" fill="url(#glow)"/>

  <!-- Perspective grid -->
  <g opacity="0.07" stroke="${pal.gridStroke}" stroke-width="1">
    ${[0,1,2,3,4,5,6,7,8].map(i=>`<line x1="${i*150}" y1="0" x2="${600 + (i-4)*80}" y2="628"/>`).join('')}
    ${[1,2,3,4,5].map(i=>`<line x1="0" y1="${i*105}" x2="1200" y2="${i*105}"/>`).join('')}
  </g>

  <!-- Left accent slash -->
  <polygon points="0,0 80,0 0,628" fill="${pal.accent}" opacity="${pal.slashOpacity}"/>
  <polygon points="0,0 12,0 0,160" fill="${pal.accent}" opacity="0.7"/>

  <!-- Top-left rule -->
  <rect x="0" y="0" width="6" height="628" fill="url(#accent)"/>

  <!-- Glow orb behind text (blurred) -->
  <circle cx="320" cy="314" r="200" fill="${pal.accent}" opacity="0.06" filter="url(#blur12)"/>

  <!-- Logo mark -->
  <polygon points="30,22 58,38 30,54" fill="${pal.accent}"/>
  <text x="70" y="42" fill="${pal.textMain}" font-size="12" font-weight="800" letter-spacing="4" opacity="0.9">AGENTS PILOT</text>
  <line x1="28" y1="66" x2="680" y2="66" stroke="${pal.accent}" stroke-width="1" opacity="0.4"/>

  <!-- Platform badge — top right -->
  <rect x="${1200 - plat.length * 9 - 52}" y="18" width="${plat.length * 9 + 36}" height="32" rx="6" fill="${pal.accent}" opacity="0.12"/>
  <rect x="${1200 - plat.length * 9 - 52}" y="18" width="${plat.length * 9 + 36}" height="32" rx="6" fill="none" stroke="${pal.accent}" stroke-width="1.5"/>
  <text x="${1200 - plat.length * 4.5 - 34}" y="39" fill="${pal.accent}" font-size="12" font-weight="700" letter-spacing="2" text-anchor="middle">${esc(plat.toUpperCase())}</text>

  ${title && hook ? `
  <!-- Category label -->
  <text x="28" y="106" fill="${pal.textAccent}" font-size="14" font-weight="700" letter-spacing="2" opacity="0.85">${esc(trunc(title,48).toUpperCase())}</text>
  <line x1="28" y1="114" x2="${Math.min(28 + title.length * 9, 560)}" y2="114" stroke="${pal.accent}" stroke-width="2" opacity="0.5"/>
  ` : ''}

  <!-- Main headline — large impactful text -->
  <text x="28" y="${headY1}" fill="${pal.textMain}" font-size="76" font-weight="900" letter-spacing="-2">${esc(headA)}</text>
  ${headB ? `<text x="28" y="${headY2}" fill="${pal.accent}" font-size="76" font-weight="900" letter-spacing="-2">${esc(headB)}</text>` : ''}
  ${headC ? `<text x="28" y="${headY3}" fill="${pal.textMain}" font-size="76" font-weight="900" letter-spacing="-2" opacity="0.85">${esc(headC)}</text>` : ''}

  <!-- Divider line with glow -->
  <line x1="28" y1="${headY3 || headY2 || headY1 + 40}" x2="700" y2="${headY3 || headY2 || headY1 + 40}" stroke="url(#accent)" stroke-width="2" opacity="0.5"/>

  <!-- Body text -->
  ${body ? `
  <text x="28" y="${(headY3 || headY2 || headY1) + 58}" fill="${pal.textSub}" font-size="20" font-weight="400">${esc(bodyLine1)}</text>
  ${bodyLine2 ? `<text x="28" y="${(headY3 || headY2 || headY1) + 84}" fill="${pal.textSub}" font-size="20" font-weight="400">${esc(bodyLine2)}</text>` : ''}
  ` : ''}

  <!-- Bottom bar -->
  <rect x="0" y="580" width="1200" height="48" fill="${pal.accent}" opacity="0.07"/>
  <line x1="0" y1="580" x2="1200" y2="580" stroke="${pal.accent}" stroke-width="1" opacity="0.3"/>

  <!-- Hashtags -->
  ${tags.map((tag, i) => `
  <rect x="${28 + i * 190}" y="590" width="${tag.length * 8 + 20}" height="26" rx="13" fill="${pal.accent}" opacity="0.15"/>
  <text x="${28 + i * 190 + 10}" y="607" fill="${pal.accentAlt}" font-size="13" font-weight="600">${esc(tag)}</text>
  `).join('')}

  <!-- Corner accent -->
  <polygon points="1200,628 1140,628 1200,568" fill="${pal.accent}" opacity="0.15"/>
  <polygon points="1200,628 1192,628 1200,620" fill="${pal.accent}" opacity="0.6"/>
</svg>`
  }

  async function generateClaudeDesign(template: typeof FALLBACK_TEMPLATES[0]) {
    setClaudeDesigning(template.collateral)
    setError(null)
    try {
      const platform = template.platforms.split(',')[0].trim()
      const svg = buildPostSVG(
        template.collateral,
        form.hook || '',
        template.caption,
        platform,
        form.hashtags || '',
        (template as ActiveTemplate).design_prompt || suggestVisualPrompt(template.collateral, template.caption, template.background),
      )

      // SVG → PNG in browser via canvas
      const blob = await new Promise<Blob>((resolve, reject) => {
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width  = 1200
          canvas.height = 628
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, 1200, 628)
          URL.revokeObjectURL(url)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas export failed')), 'image/png')
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
        img.src = url
      })

      // Upload PNG to Supabase storage
      const path = `claude-${Date.now()}-${Math.random().toString(36).slice(2)}.png`
      const file = new File([blob], path, { type: 'image/png' })
      const { data, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
      if (upErr || !data) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)

      // Apply template + set design
      applyTemplate(template)
      setSelectedDesign({ url: publicUrl })
      setSuccess('Claude design generated!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Claude design failed')
    } finally {
      setClaudeDesigning(null)
    }
  }

  function buildInfographicSVG(title: string, caption: string, platform: string, aiPrompt?: string): string {
    const esc   = (s: string) => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s
    const pal   = parsePalette(aiPrompt ?? '')
    const lines = caption.split(/[\n.!?]+/).map(s => s.trim()).filter(s => s.length > 4).slice(0, 5)
    const plat  = platform || 'LinkedIn'

    // Color system: each row gets an accent (palette-driven)
    const ACCENTS = pal.rowAccents
    const ROW_H   = 82
    const ROW_Y0  = 168

    const rows = lines.map((line, i) => {
      const acc = ACCENTS[i % ACCENTS.length]
      const y   = ROW_Y0 + i * ROW_H
      return `
  <!-- Row ${i+1} -->
  <rect x="44" y="${y}" width="1112" height="${ROW_H - 8}" rx="10" fill="${acc}" opacity="0.06"/>
  <rect x="44" y="${y}" width="1112" height="${ROW_H - 8}" rx="10" fill="none" stroke="${acc}" stroke-width="1" opacity="0.25"/>
  <!-- Number circle -->
  <circle cx="84" cy="${y + (ROW_H - 8)/2}" r="20" fill="${acc}" opacity="0.2"/>
  <circle cx="84" cy="${y + (ROW_H - 8)/2}" r="20" fill="none" stroke="${acc}" stroke-width="1.5"/>
  <text x="84" y="${y + (ROW_H - 8)/2 + 6}" fill="${acc}" font-size="16" font-weight="800" text-anchor="middle">${i+1}</text>
  <!-- Content -->
  <text x="118" y="${y + (ROW_H - 8)/2 + 7}" fill="white" font-size="20" font-weight="600">${esc(trunc(line, 68))}</text>
  <!-- Right accent line -->
  <rect x="1140" y="${y + 8}" width="4" height="${ROW_H - 24}" rx="2" fill="${acc}" opacity="0.5"/>
`}).join('')

    return `<svg viewBox="0 0 1200 628" width="1200" height="628" xmlns="http://www.w3.org/2000/svg" font-family="Inter,system-ui,sans-serif">
  <defs>
    <linearGradient id="ibg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${pal.bg1}"/>
      <stop offset="100%" stop-color="${pal.bg2}"/>
    </linearGradient>
    <linearGradient id="hdr" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${pal.accent}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${pal.accent}" stop-opacity="0"/>
    </linearGradient>
    <filter id="gblur"><feGaussianBlur stdDeviation="20"/></filter>
  </defs>

  <!-- Background -->
  <rect width="1200" height="628" fill="url(#ibg)"/>

  <!-- Subtle dot grid -->
  <pattern id="dots" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="20" cy="20" r="1" fill="${pal.accent}" opacity="0.12"/>
  </pattern>
  <rect width="1200" height="628" fill="url(#dots)"/>

  <!-- Header band -->
  <rect x="0" y="0" width="1200" height="128" fill="url(#hdr)"/>
  <rect x="0" y="0" width="8" height="628" fill="${pal.accent}"/>
  <line x1="8" y1="128" x2="1200" y2="128" stroke="${pal.accent}" stroke-width="1.5" opacity="0.35"/>

  <!-- Glow orb top-left -->
  <circle cx="200" cy="80" r="100" fill="${pal.accent}" opacity="0.08" filter="url(#gblur)"/>

  <!-- Logo -->
  <polygon points="28,24 56,40 28,56" fill="${pal.accent}"/>
  <text x="68" y="44" fill="${pal.textMain}" font-size="12" font-weight="800" letter-spacing="4">AGENTS PILOT</text>

  <!-- Title -->
  <text x="28" y="100" fill="${pal.textMain}" font-size="30" font-weight="900" letter-spacing="-0.5">${esc(trunc(title, 52))}</text>
  <line x1="28" y1="112" x2="${Math.min(28 + title.length * 17, 700)}" y2="112" stroke="${pal.accent}" stroke-width="2" opacity="0.6"/>

  <!-- Platform pill -->
  <rect x="${1200 - plat.length * 9 - 52}" y="20" width="${plat.length * 9 + 36}" height="30" rx="6" fill="${pal.accent}" opacity="0.12"/>
  <rect x="${1200 - plat.length * 9 - 52}" y="20" width="${plat.length * 9 + 36}" height="30" rx="6" fill="none" stroke="${pal.accent}" stroke-width="1.5"/>
  <text x="${1200 - plat.length * 4.5 - 34}" y="40" fill="${pal.accent}" font-size="12" font-weight="700" letter-spacing="2" text-anchor="middle">${esc(plat.toUpperCase())}</text>

  <!-- Rows -->
  ${rows}

  <!-- Footer -->
  <rect x="0" y="596" width="1200" height="32" fill="${pal.accent}" opacity="0.06"/>
  <line x1="8" y1="596" x2="1200" y2="596" stroke="${pal.accent}" stroke-width="1" opacity="0.2"/>
  <text x="28" y="616" fill="${pal.textSub}" font-size="12" font-weight="500">agentspilot.com</text>
  <text x="1172" y="616" fill="${pal.textSub}" font-size="12" font-weight="500" text-anchor="end">${esc(plat)}</text>

  <!-- Corner triangle accent -->
  <polygon points="1200,628 1160,628 1200,596" fill="${pal.accent}" opacity="0.3"/>
</svg>`
  }

  async function generateTemplateDesign(mode: 'auto' | 'infographic' | 'post') {
    setTemplateDesignGenerating(mode)
    try {
      const platform = templateForm.platforms?.split(',')[0]?.trim() || 'LinkedIn'
      const aiPrompt = templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)
      const svg = mode === 'infographic'
        ? buildInfographicSVG(templateForm.title || '', templateForm.caption || templateForm.background || '', platform, aiPrompt)
        : buildPostSVG(
            templateForm.title || '',
            templateForm.cta || '',
            templateForm.caption || templateForm.background || '',
            platform,
            '',
            aiPrompt,
          )

      const blob = await new Promise<Blob>((resolve, reject) => {
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 1200; canvas.height = 628
          canvas.getContext('2d')!.drawImage(img, 0, 0, 1200, 628)
          URL.revokeObjectURL(url)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
        img.src = url
      })

      const path = `${mode}-${Date.now()}.png`
      const file = new File([blob], path, { type: 'image/png' })
      const { data, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
      if (upErr || !data) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)
      setTemplateForm(f => ({ ...f, design_preview_url: publicUrl }))
      if (editingTemplate) {
        await supabase.from('post_templates').update({ design_preview_url: publicUrl }).eq('id', editingTemplate.id)
        fetchTemplates()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Design generation failed')
    } finally {
      setTemplateDesignGenerating(null)
    }
  }

  function buildEnrichedPrompt() {
    const parts: string[] = []
    if (templateForm.design_prompt) parts.push(templateForm.design_prompt)
    if (templateForm.background) parts.push(`Key message to incorporate: "${templateForm.background}"`)
    if (templateForm.cta) parts.push(`CTA text on image: "${templateForm.cta}"`)
    if (templateForm.caption) parts.push(`Post caption context: "${templateForm.caption.slice(0, 120)}…"`)
    if (templateForm.platforms) parts.push(`Optimized for: ${templateForm.platforms}`)
    parts.push('Brand: AgentsPilot CRM. Colors: dark background, orange accent (#f97316). Square 1:1 format. Place the brand logo in the top-left corner of the image.')
    return parts.join('\n\n')
  }

  async function generateWithFlux() {
    const prompt = buildEnrichedPrompt()
    if (!prompt) return
    setFluxGenerating(true)
    try {
      let json: { image?: string; contentType?: string; error?: string; loading?: boolean } = {}
      for (let attempt = 0; attempt < 3; attempt++) {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt }),
        })
        json = await res.json().catch(() => ({ error: `HTTP ${res.status} — empty response` }))
        if (json.loading) {
          await new Promise(r => setTimeout(r, 20000)) // wait 20s for model to load
          continue
        }
        break
      }
      if (json.error) { alert('Generation failed: ' + json.error); return }
      if (!json.image) { alert('No image returned. Try again.'); return }
      const base64 = json.image.split(',')[1]
      const byteArr = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const file = new File([byteArr], `flux-${Date.now()}.jpg`, { type: json.contentType || 'image/jpeg' })
      const url = await uploadDesignImage(file)
      if (url) {
        setTemplateForm(f => ({ ...f, design_preview_url: url }))
        // Auto-save to DB if editing an existing template
        if (editingTemplate) {
          await supabase.from('post_templates').update({ design_preview_url: url }).eq('id', editingTemplate.id)
          fetchTemplates()
        }
      }
    } finally {
      setFluxGenerating(false)
    }
  }

  async function queueCanvaJob(templateTitle: string) {
    const dbT = dbTemplates.find(t => t.title === templateTitle)
    if (!dbT) return
    await supabase.from('canva_jobs').insert([{ template_id: dbT.id, title: templateTitle, status: 'pending' }])
    alert(`✅ "${templateTitle}" queued for Canva finalization.\nTell Claude: "process pending Canva jobs"`)
  }

  async function generateMovie() {
    if (!editingTemplate) return
    setMovieGenerating(true)
    setError(null)
    try {
      const platform = templateForm.platforms?.split(',')[0]?.trim() || 'LinkedIn'
      const aiPrompt = templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)
      const svg = buildPostSVG(templateForm.title || '', templateForm.cta || '', templateForm.caption || templateForm.background || '', platform, '', aiPrompt)

      const blob = await new Promise<Blob>((resolve, reject) => {
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(svgBlob)
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 1200; canvas.height = 628
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0, 1200, 628)
          // Play button overlay
          ctx.fillStyle = 'rgba(0,0,0,0.45)'
          ctx.beginPath(); ctx.arc(600, 314, 56, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#f97316'
          ctx.beginPath(); ctx.moveTo(582, 286); ctx.lineTo(582, 342); ctx.lineTo(630, 314); ctx.closePath(); ctx.fill()
          URL.revokeObjectURL(url)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
        }
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
        img.src = url
      })

      const path = `movie-thumb-${Date.now()}.png`
      const file = new File([blob], path, { type: 'image/png' })
      const { data, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
      if (upErr || !data) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)

      const movieUrl = `remotion:${editingTemplate.id}`
      setTemplateForm(f => ({ ...f, movie_preview_url: publicUrl, movie_url: movieUrl }))
      await supabase.from('post_templates').update({ movie_preview_url: publicUrl, movie_url: movieUrl }).eq('id', editingTemplate.id)
      if (editingTemplate.collateral === selectedTemplate) {
        setSelectedDesign(d => d ? { ...d, movie_preview_url: publicUrl, movie_url: movieUrl } : d)
        setSelectedMediaSlot('movie')
      }
      fetchTemplates()
      setSuccess('Movie preview generated!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Movie generation failed')
    } finally {
      setMovieGenerating(false)
    }
  }

  async function uploadProductScreenshot(file: File) {
    if (productScreenshots.length >= 3) return
    setProductScreenshotUploading(true)
    const ext = file.name.split('.').pop()
    const path = `product-screenshot-${Date.now()}.${ext}`
    const { data, error } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
    setProductScreenshotUploading(false)
    if (error || !data) return
    const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)
    setProductScreenshots(prev => [...prev, publicUrl])
  }

  async function generateProductMovie() {
    if (!editingTemplate || productScreenshots.length === 0) return
    setMovieGenerating(true)
    setError(null)
    try {
      const firstUrl = productScreenshots[0]
      const blob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = 1200; canvas.height = 628
          const ctx = canvas.getContext('2d')!
          const scale = Math.max(1200 / img.width, 628 / img.height)
          const w = img.width * scale, h = img.height * scale
          ctx.drawImage(img, (1200 - w) / 2, (628 - h) / 2, w, h)
          ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, 1200, 628)
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(600, 314, 56, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#f97316'; ctx.beginPath(); ctx.moveTo(582, 286); ctx.lineTo(582, 342); ctx.lineTo(630, 314); ctx.closePath(); ctx.fill()
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '700 11px Inter,system-ui,sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(`PRODUCT DEMO  •  ${productScreenshots.length} screen${productScreenshots.length > 1 ? 's' : ''}`, 600, 390)
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
        }
        img.onerror = () => reject(new Error('Image load failed'))
        img.src = firstUrl
      })

      const path = `product-movie-thumb-${Date.now()}.png`
      const file = new File([blob], path, { type: 'image/png' })
      const { data, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
      if (upErr || !data) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(data.path)

      const movieUrl = `product:${productScreenshots.join('|')}`
      setTemplateForm(f => ({ ...f, movie_preview_url: publicUrl, movie_url: movieUrl }))
      await supabase.from('post_templates').update({ movie_preview_url: publicUrl, movie_url: movieUrl }).eq('id', editingTemplate.id)
      if (editingTemplate.collateral === selectedTemplate) {
        setSelectedDesign(d => d ? { ...d, movie_preview_url: publicUrl, movie_url: movieUrl } : d)
        setSelectedMediaSlot('movie')
      }
      fetchTemplates()
      setSuccess(`Product demo saved — ${productScreenshots.length} screen${productScreenshots.length > 1 ? 's' : ''}!`)
      setTimeout(() => setSuccess(null), 3000)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Product movie generation failed')
    } finally {
      setMovieGenerating(false)
    }
  }

  async function queueMovieJob() {
    if (!editingTemplate) return
    setMovieQueuing(true)
    try {
      const prompt = `${editingTemplate.background} ${editingTemplate.caption}`.slice(0, 300)
      const res = await fetch('/api/canva-queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_id: editingTemplate.id,
          title: editingTemplate.title,
          query: prompt,
          design_type: 'movie',
        }),
      })
      const d = await res.json()
      if (d.job_id) { setSuccess('Queued — type "movie" in Claude Code'); }
    } catch {
      setError('Failed to queue movie job')
    } finally {
      setMovieQueuing(false)
    }
  }

  async function generateAiMovie() {
    if (!editingTemplate) return
    setAiMovieGenerating(true)
    setError(null)
    try {
      const prompt = templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok || !data.image) throw new Error(data.error || 'Image generation failed')

      // Convert base64 to blob and upload to Supabase
      const base64 = data.image.split(',')[1]
      const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
      const blob = new Blob([bytes], { type: data.contentType || 'image/jpeg' })
      const ext = (data.contentType || 'image/jpeg').includes('png') ? 'png' : 'jpg'
      const filePath = `designs/ai-movie-${editingTemplate.id}-${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('post-designs')
        .upload(filePath, blob, { contentType: data.contentType || 'image/jpeg', upsert: true })
      if (upErr || !upData) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(upData.path)

      const movieUrl = `ai-movie:${publicUrl}`
      setTemplateForm(f => ({ ...f, movie_url: movieUrl, movie_preview_url: publicUrl }))
      await supabase.from('post_templates')
        .update({ movie_url: movieUrl, movie_preview_url: publicUrl })
        .eq('id', editingTemplate.id)
      if (editingTemplate.collateral === selectedTemplate) {
        setSelectedDesign(d => d ? { ...d, movie_preview_url: publicUrl, movie_url: movieUrl } : d)
        setSelectedMediaSlot('movie')
      }
      fetchTemplates()
      setSuccess('AI Movie created!')
    } catch (e) {
      setError(String(e))
    } finally {
      setAiMovieGenerating(false)
    }
  }

  async function uploadMovie(file: File) {
    if (!editingTemplate) return
    setMovieUploading(true)
    setError(null)
    try {
      const ext = file.name.split('.').pop() ?? 'mp4'
      const filePath = `designs/movie-${editingTemplate.id}-${Date.now()}.${ext}`
      const { data: upData, error: upErr } = await supabase.storage
        .from('post-designs')
        .upload(filePath, file, { contentType: file.type || 'video/mp4', upsert: true })
      if (upErr || !upData) throw new Error(upErr?.message ?? 'Upload failed')
      const { data: { publicUrl } } = supabase.storage.from('post-designs').getPublicUrl(upData.path)

      const movieUrl = `upload:${publicUrl}`
      // Don't store video URL as preview image — use existing image preview if available
      setTemplateForm(f => ({ ...f, movie_url: movieUrl }))
      await supabase.from('post_templates')
        .update({ movie_url: movieUrl })
        .eq('id', editingTemplate.id)
      if (editingTemplate.collateral === selectedTemplate) {
        setSelectedDesign(d => d ? { ...d, movie_url: movieUrl } : d)
        setSelectedMediaSlot('movie')
      }
      fetchTemplates()
      setSuccess('Video uploaded!')
    } catch (e) {
      setError(String(e))
    } finally {
      setMovieUploading(false)
    }
  }

  async function openCanvaPicker() {
    if (canvaDesigns.length === 0) {
      const res = await fetch('/api/canva/designs')
      const json = await res.json()
      setCanvaDesigns(json.designs || [])
    }
    setShowCanvaPicker(true)
  }

  async function generateClaudeDesignFromTemplate() {
    setTemplateDesignGenerating('post')
    setError(null)
    try {
      const res = await fetch('/api/claude-design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:         templateForm.title,
          background:    templateForm.background,
          cta:           templateForm.cta,
          caption:       templateForm.caption,
          platforms:     templateForm.platforms,
          design_prompt: templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Claude Design failed')

      let publicUrl = ''

      if (data.image) {
        // AI image + text overlay via Canvas
        const blob = await new Promise<Blob>((resolve, reject) => {
          const img = new window.Image()
          img.onload = () => {
            const SIZE = 1080
            const canvas = document.createElement('canvas')
            canvas.width = SIZE; canvas.height = SIZE
            const ctx = canvas.getContext('2d')!

            // 1. Draw AI-generated background (cover crop)
            const scale = Math.max(SIZE / img.width, SIZE / img.height)
            const w = img.width * scale, h = img.height * scale
            ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h)

            // 2. Dark gradient overlay for text readability
            const grad = ctx.createLinearGradient(0, 0, 0, SIZE)
            grad.addColorStop(0,   'rgba(0,0,0,0.15)')
            grad.addColorStop(0.5, 'rgba(0,0,0,0.35)')
            grad.addColorStop(1,   'rgba(0,0,0,0.75)')
            ctx.fillStyle = grad
            ctx.fillRect(0, 0, SIZE, SIZE)

            // 3. Brand logo mark (orange triangle)
            ctx.beginPath()
            ctx.moveTo(36, 36); ctx.lineTo(62, 51); ctx.lineTo(36, 66)
            ctx.fillStyle = '#f97316'; ctx.fill()
            ctx.font = 'bold 13px system-ui, sans-serif'
            ctx.fillStyle = 'white'
            ctx.letterSpacing = '3px'
            ctx.fillText('AGENTS PILOT', 72, 56)

            // 4. Hook / title
            const hook = templateForm.title || ''
            ctx.font = 'bold 56px system-ui, sans-serif'
            ctx.fillStyle = 'white'
            ctx.letterSpacing = '0px'
            const wrapText = (text: string, x: number, y: number, maxW: number, lineH: number) => {
              const words = text.split(' ')
              let line = ''
              let cy = y
              for (const word of words) {
                const test = line + word + ' '
                if (ctx.measureText(test).width > maxW && line) {
                  ctx.fillText(line.trim(), x, cy)
                  line = word + ' '
                  cy += lineH
                } else { line = test }
              }
              if (line) ctx.fillText(line.trim(), x, cy)
              return cy
            }
            let y = wrapText(hook, 50, SIZE * 0.55, SIZE - 100, 68)

            // 5. CTA line
            if (templateForm.cta) {
              y += 32
              ctx.font = '500 26px system-ui, sans-serif'
              ctx.fillStyle = '#f97316'
              ctx.fillText(templateForm.cta, 50, y)
              y += 36
            }

            // 6. Short caption (first 100 chars)
            const cap = (templateForm.caption || templateForm.background || '').slice(0, 100)
            if (cap) {
              y += 8
              ctx.font = '400 20px system-ui, sans-serif'
              ctx.fillStyle = 'rgba(255,255,255,0.7)'
              wrapText(cap + (cap.length === 100 ? '…' : ''), 50, y, SIZE - 100, 28)
            }

            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/jpeg', 0.92)
          }
          img.onerror = () => reject(new Error('Image load failed'))
          img.src = data.image
        })
        const path = `claude-${Date.now()}.jpg`
        const file = new File([blob], path, { type: 'image/jpeg' })
        const { data: up, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
        if (upErr || !up) throw new Error(upErr?.message ?? 'Upload failed')
        publicUrl = supabase.storage.from('post-designs').getPublicUrl(up.path).data.publicUrl
      } else if (data.svg) {
        // SVG → canvas → PNG → upload
        const blob = await new Promise<Blob>((resolve, reject) => {
          const svgBlob = new Blob([data.svg], { type: 'image/svg+xml;charset=utf-8' })
          const url = URL.createObjectURL(svgBlob)
          const img = new window.Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = 1200; canvas.height = 628
            canvas.getContext('2d')!.drawImage(img, 0, 0, 1200, 628)
            URL.revokeObjectURL(url)
            canvas.toBlob(b => b ? resolve(b) : reject(new Error('Export failed')), 'image/png')
          }
          img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('SVG load failed')) }
          img.src = url
        })
        const path = `claude-${Date.now()}.png`
        const file = new File([blob], path, { type: 'image/png' })
        const { data: up, error: upErr } = await supabase.storage.from('post-designs').upload(path, file, { upsert: true })
        if (upErr || !up) throw new Error(upErr?.message ?? 'Upload failed')
        publicUrl = supabase.storage.from('post-designs').getPublicUrl(up.path).data.publicUrl
      }

      if (publicUrl) {
        // Clear design_url so "Edit in Canva" creates a fresh design with the new image
        setTemplateForm(f => ({ ...f, design_preview_url: publicUrl, design_url: '' }))
        if (editingTemplate) {
          await supabase.from('post_templates').update({ design_preview_url: publicUrl, design_url: null }).eq('id', editingTemplate.id)
          fetchTemplates()
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Claude Design failed')
    } finally {
      setTemplateDesignGenerating(null)
    }
  }

  async function generateCanvaDesign(targetWin?: Window | null) {
    setCanvaGenerating(true)
    setCanvaCandidates([])
    setError(null)
    try {
      // If we already have a generated image, import it into Canva for editing
      const imageUrl = templateForm.design_preview_url || null
      const res = await fetch('/api/canva-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_type: 'instagram_post', image_url: imageUrl }),
      })
      const data = await res.json()
      if (res.status === 401 && data.error === 'canva_not_connected') {
        if (targetWin) targetWin.close()
        window.location.href = '/api/auth/canva'
        return
      }
      if (!res.ok) throw new Error(data.error ?? 'Failed to create design')
      // Opens directly in Canva — save URL and redirect pre-opened window
      const editUrl = data.edit_url
      if (editUrl) {
        setTemplateForm(f => ({ ...f, design_url: editUrl }))
        if (editingTemplate) {
          await supabase.from('post_templates').update({ design_url: editUrl }).eq('id', editingTemplate.id)
          fetchTemplates()
        }
        if (targetWin) {
          targetWin.location.href = editUrl
        } else {
          window.open(editUrl, 'canva')
        }
        setSuccess('Canva design created and opened!')
        setTimeout(() => setSuccess(null), 4000)
      } else {
        if (targetWin) targetWin.close()
        setError('Could not get Canva edit URL')
      }
    } catch (err) {
      if (targetWin) targetWin.close()
      setError(err instanceof Error ? err.message : 'Canva generation failed')
    }
    setCanvaGenerating(false)
  }

  async function confirmCanvaCandidate(candidate: { candidate_id: string; job_id: string; url: string; thumbnail: string }) {
    setCanvaConfirming(candidate.candidate_id)
    try {
      const res = await fetch('/api/canva-generate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: candidate.job_id, candidate_id: candidate.candidate_id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create design')
      const editUrl = data?.design_summary?.urls?.edit_url ?? candidate.url
      // Save to template form and DB
      setTemplateForm(f => ({ ...f, design_url: editUrl, design_preview_url: candidate.thumbnail }))
      if (editingTemplate) {
        await supabase.from('post_templates').update({ design_url: editUrl, design_preview_url: candidate.thumbnail }).eq('id', editingTemplate.id)
        fetchTemplates()
      }
      setCanvaCandidates([])
      setSuccess('Canva design created! Click "Edit in Canva" to open it.')
      setTimeout(() => setSuccess(null), 4000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to confirm design')
    }
    setCanvaConfirming(null)
  }

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!templateForm.title.trim()) return
    setTemplateSaving(true)
    const payload: Record<string, unknown> = { ...templateForm, updated_at: new Date().toISOString() }
    // Never overwrite URL fields with empty string — preserve existing values
    for (const f of ['design_url','design_preview_url','infographic_url','infographic_preview_url','movie_url','movie_preview_url']) {
      if (!payload[f]) delete payload[f]
    }
    if (editingTemplate) {
      await supabase.from('post_templates').update(payload).eq('id', editingTemplate.id)
    } else {
      await supabase.from('post_templates').insert([{ ...payload, active: true }])
    }
    setTemplateSaving(false)
    setShowTemplateForm(false)
    setEditingTemplate(null)
    fetchTemplates()
  }

  async function deleteTemplate(id: string) {
    await supabase.from('post_templates').update({ active: false }).eq('id', id)
    fetchTemplates()
  }

  function startEdit(post: SocialPost) {
    setEditingPost(post)
    setForm({
      collateral: post.collateral,
      platforms: post.platforms.split(/,\s*/).map(p => p.trim()).filter(Boolean),
      background: post.background,
      media_type: post.media_type,
      cta: post.cta,
      caption: post.caption,
      scheduled_date: post.scheduled_date ?? '',
      status: post.status,
      campaign_id: post.campaign_id ?? '',
      hook: '',
      hashtags: '',
      add_to_library: false,
      library_stages: [],
    })
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openCreateWithDate(dateStr: string) {
    setEditingPost(null)
    setForm(f => ({ ...emptyForm, scheduled_date: dateStr }))
    setSelectedTemplate(null)
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function quickSchedule(template: typeof FALLBACK_TEMPLATES[0] | null, date: string) {
    setDayPickerSaving(true)
    const payload = template ? {
      collateral:     template.collateral,
      platforms:      template.platforms,
      background:     template.background,
      media_type:     template.media_type,
      cta:            template.cta,
      caption:        template.caption,
      scheduled_date: date,
      status:         'scheduled' as const,
    } : {
      collateral:     'New Post',
      platforms:      '',
      background:     '',
      media_type:     '',
      cta:            '',
      caption:        '',
      scheduled_date: date,
      status:         'draft' as const,
    }
    const { error } = await supabase.from('social_posts').insert([payload])
    setDayPickerSaving(false)
    if (error) { setError(error.message); return }
    setDayPickerDate(null)
    setSuccess(template ? `"${template.collateral}" scheduled for ${date}` : 'Blank post added')
    fetchPosts()
    setTimeout(() => setSuccess(null), 3000)
  }

  function postTypeIcon(mediaType: string) {
    const m = (mediaType ?? '').toLowerCase()
    if (m.includes('video') || m.includes('reel')) return '🎬'
    if (m.includes('static') || m.includes('image') || m.includes('photo')) return '📷'
    if (m.includes('poll')) return '📊'
    if (m.includes('carousel')) return '🎠'
    return '📝'
  }

  // Calendar data
  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfMonth(calYear, calMonth)
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const postsByDay: Record<number, SocialPost[]> = {}
  posts.forEach(p => {
    if (p.scheduled_date) {
      const d = new Date(p.scheduled_date)
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        const day = d.getDate()
        if (!postsByDay[day]) postsByDay[day] = []
        postsByDay[day].push(p)
      }
    }
  })

  // Platform grouping
  const platformGroups: Record<string, SocialPost[]> = {}
  ALL_PLATFORMS.forEach(p => { platformGroups[p] = [] })
  posts.forEach(post => {
    const platforms = post.platforms.split(',').map(p => p.trim())
    platforms.forEach(pl => {
      const key = ALL_PLATFORMS.find(p => p.toLowerCase() === pl.toLowerCase()) ?? 'Other'
      if (!platformGroups[key]) platformGroups[key] = []
      platformGroups[key].push(post)
    })
  })

  // Stats
  const totalPosts     = posts.length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount     = posts.filter(p => p.status === 'draft').length
  const unplannedPosts = posts.filter(p => !p.scheduled_date && p.status !== 'published')
  const plannedCount   = Object.values(postsByDay).flat().length
  const todayStr     = new Date().toISOString().split('T')[0]  // "2026-05-23"
  const overduePosts = posts.filter(p =>
    p.status === 'scheduled' && p.scheduled_date && p.scheduled_date < todayStr
  )

  const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700'

  const TABS = [
    { id: 'calendar' as TabId, label: 'Monthly Calendar', icon: Calendar },
    { id: 'platform' as TabId, label: 'By Platform', icon: LayoutGrid },
    { id: 'create' as TabId, label: editingPost ? 'Edit Post' : 'Create Post', icon: PenSquare },
    { id: 'tracker' as TabId, label: 'Post Tracker', icon: ListChecks },
  ]

  return (
    <div>
      <Header
        title="Post Management"
        subtitle={`${totalPosts} posts · ${scheduledCount} scheduled · ${publishedCount} published`}
      />

      {/* Admin badge + connection indicators */}
      <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
          🔐 Admin Only
        </span>
        <div className="flex items-center gap-2">
          {[
            { key: 'linkedin',  label: 'in', color: 'bg-blue-600',   ring: 'ring-blue-300',   connectHref: null },
            { key: 'facebook',  label: 'f',  color: 'bg-indigo-600', ring: 'ring-indigo-300', connectHref: '/api/auth/facebook' },
            { key: 'instagram', label: 'ig', color: 'bg-pink-500',   ring: 'ring-pink-300',   connectHref: '/api/auth/instagram' },
            { key: 'tiktok',    label: 'tk', color: 'bg-slate-900',  ring: 'ring-slate-400',  connectHref: '/api/auth/tiktok' },
          ].map(p => {
            const connected = isConnected(p.key)
            const handleClick = () => {
              if (p.key === 'linkedin') { setShowLinkedInManual(true); return }
              if (!connected && p.connectHref) window.location.href = p.connectHref
            }
            return (
              <div key={p.key} className="relative group">
                <button
                  onClick={handleClick}
                  title={connected ? `${p.key} connected — click to re-connect` : `Connect ${p.key}`}
                  className={`h-7 w-7 rounded-full ${p.color} flex items-center justify-center text-white text-xs font-bold transition-all hover:scale-110 ${connected ? `ring-2 ${p.ring}` : 'opacity-40 hover:opacity-70'}`}>
                  {p.label}
                </button>
                {connected && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white pointer-events-none" />
                )}
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block text-xs bg-slate-800 text-white px-2 py-0.5 rounded whitespace-nowrap z-10 pointer-events-none">
                  {p.key.charAt(0).toUpperCase() + p.key.slice(1)}: {connected ? 'Connected ✓' : 'Click to connect'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Tab bar */}
      <div className="sticky top-16 z-30 border-b border-gray-200 bg-white px-6 mt-3">
        <div className="flex items-center">
          <div className="flex gap-1 flex-1">
            {TABS.map(tab => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                    active ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-gray-300'
                  }`}>
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Overdue alarm bell — always visible */}
          <div className="relative ml-2 pb-1">
            <button
              onClick={() => setShowOverduePanel(v => !v)}
              className={`relative p-2 rounded-lg transition-colors ${
                overduePosts.length > 0
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-slate-300 hover:bg-gray-100'
              }`}
              title={overduePosts.length > 0 ? `${overduePosts.length} overdue post${overduePosts.length > 1 ? 's' : ''}` : 'No overdue posts'}>
              <Bell className={`h-5 w-5 ${overduePosts.length > 0 ? 'animate-pulse' : ''}`} />
              {overduePosts.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                  {overduePosts.length}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showOverduePanel && (
              <div className="absolute right-0 top-12 z-50 w-80 bg-white rounded-xl shadow-2xl border border-red-100 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-100">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-red-500" />
                    <p className="text-sm font-semibold text-red-700">Overdue Posts</p>
                    <span className="text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{overduePosts.length}</span>
                  </div>
                  <button onClick={() => setShowOverduePanel(false)}><X className="h-4 w-4 text-slate-400" /></button>
                </div>
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {overduePosts.map(post => (
                    <button key={post.id}
                      onClick={() => { setShowOverduePanel(false); setActiveTab('platform') }}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left">
                      <span className="text-lg mt-0.5">{postTypeIcon(post.media_type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{post.collateral}</p>
                        <p className="text-xs text-slate-500 truncate">{post.platforms}</p>
                        <p className="text-xs text-red-500 font-medium mt-0.5">
                          Due: {new Date(post.scheduled_date!).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-xs text-orange-500 font-medium shrink-0 mt-1">Publish →</span>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                  <button onClick={() => { setShowOverduePanel(false); setActiveTab('platform') }}
                    className="text-xs font-medium text-orange-600 hover:text-orange-700">
                    Go to By Platform to publish →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">

        {/* Publish results banner */}
        {publishResults && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-2">
            <p className="text-xs font-semibold text-slate-700 mb-2">Publish Results</p>
            {Object.entries(publishResults).map(([platform, result]) => (
              <div key={platform} className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${result.success ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                {result.success ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                <span className="font-medium">{platform}:</span> {result.message}
              </div>
            ))}
            <button onClick={() => setPublishResults(null)} className="text-xs text-slate-400 hover:text-slate-600">Dismiss</button>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Posts', value: totalPosts,     color: 'text-sky-600',     bg: 'bg-sky-50' },
            { label: 'Drafts',      value: draftCount,     color: 'text-slate-600',   bg: 'bg-gray-50' },
            { label: 'Scheduled',   value: scheduledCount, color: 'text-amber-600',   bg: 'bg-amber-50' },
            { label: 'Published',   value: publishedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          ].map(k => (
            <div key={k.label} className={`rounded-xl border border-gray-200 ${k.bg} p-4`}>
              <p className="text-xs text-slate-500">{k.label}</p>
              <p className={`text-2xl font-bold mt-1 ${k.color}`}>
                {loading ? <span className="animate-pulse bg-gray-100 rounded h-7 w-8 inline-block" /> : k.value}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 flex justify-between">
            {error}<button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-600 flex items-center gap-2">
            <Check className="h-4 w-4" /> {success}
          </div>
        )}

        {/* ── CALENDAR / PLANNER TAB ───────────────────────────────────── */}
        {activeTab === 'calendar' && (
          <div className="space-y-4">

            {/* Calendar card */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <ChevronLeft className="h-5 w-5 text-slate-500" />
                  </button>
                  <h2 className="text-sm font-semibold text-slate-900 w-36 text-center">{MONTH_NAMES[calMonth]} {calYear}</h2>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <ChevronRight className="h-5 w-5 text-slate-500" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowTemplatesPanel(v => !v)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      showTemplatesPanel
                        ? 'bg-orange-50 border-orange-300 text-orange-600'
                        : 'border-gray-200 text-slate-600 hover:border-orange-300 hover:text-orange-500'
                    }`}>
                    <BookOpen className="h-3.5 w-3.5" /> Templates
                  </button>
                  <button onClick={() => openCreateWithDate('')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> New Post
                  </button>
                </div>
              </div>

              {/* Templates quick-pick panel */}
              {showTemplatesPanel && (
                <div className="border-b border-orange-100 px-6 py-3 bg-orange-50/50">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Click a template to load it into New Post</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {activeTemplates.map((t, i) => (
                      <button key={`${t.collateral}-${i}`}
                        onClick={() => { applyTemplate(t); setActiveTab('create'); setShowTemplatesPanel(false) }}
                        className="shrink-0 flex flex-col gap-0.5 px-3 py-2 rounded-lg border border-orange-200 bg-white hover:border-orange-400 hover:bg-orange-50 transition-colors text-left min-w-[150px]">
                        <span className="text-xs font-semibold text-slate-800 truncate w-full">{t.collateral}</span>
                        <span className="text-xs text-slate-400">{postTypeIcon(t.media_type)} {t.media_type}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAY_NAMES.map(d => (
                  <div key={d} className="px-2 py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="border-r border-b border-gray-100 min-h-28 bg-gray-50/30" />
                ))}
                {calendarDays.map(day => {
                  const dayPosts = postsByDay[day] ?? []
                  const isToday  = calYear === now.getFullYear() && calMonth === now.getMonth() && day === now.getDate()
                  const dateStr  = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const hasPost  = dayPosts.length > 0
                  const mainPost = dayPosts[0]

                  // Cell background based on primary post status
                  const cellBg = hasPost
                    ? mainPost.status === 'published' ? 'bg-emerald-50 border-emerald-200'
                    : mainPost.status === 'scheduled' ? 'bg-amber-50 border-amber-200'
                    : 'bg-gray-50 border-gray-200'
                    : isToday ? 'bg-orange-50/40 border-gray-100' : 'bg-white border-gray-100'

                  return (
                    <div key={day}
                      onClick={() => setDayPickerDate(dateStr)}
                      className={`border-r border-b ${cellBg} min-h-28 p-2 transition-colors group cursor-pointer hover:bg-orange-50/30`}>

                      {/* Day number */}
                      <div className="flex items-start justify-between mb-1.5">
                        <div className={`text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-orange-500 text-white' : hasPost ? 'text-slate-700' : 'text-slate-400'
                        }`}>{day}</div>
                        <div className="flex items-center gap-1">
                          {hasPost && dayPosts.length > 1 && (
                            <span className="text-xs font-semibold text-slate-500 bg-white/70 rounded px-1">{dayPosts.length}</span>
                          )}
                          <Plus className="h-3 w-3 text-slate-200 group-hover:text-orange-400 transition-colors" />
                        </div>
                      </div>

                      {/* Posts */}
                      <div className="space-y-1">
                        {dayPosts.slice(0, 2).map((post, i) => (
                          <div key={post.id}
                            onClick={e => { e.stopPropagation(); startEdit(post) }}
                            className="cursor-pointer hover:opacity-80 transition-opacity">
                            {/* Type + title */}
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className="text-sm leading-none">{postTypeIcon(post.media_type)}</span>
                              <span className="text-xs font-semibold text-slate-800 truncate leading-tight">
                                {post.collateral.length > 14 ? post.collateral.slice(0, 14) + '…' : post.collateral}
                              </span>
                            </div>
                            {/* Platforms */}
                            {i === 0 && (
                              <p className="text-xs text-slate-500 truncate leading-tight pl-5">
                                {post.platforms.split(',').map(p => p.trim()).join(' · ')}
                              </p>
                            )}
                            {/* Status pill */}
                            {i === 0 && (
                              <span className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[post.status]}`}>
                                {post.status}
                              </span>
                            )}
                          </div>
                        ))}
                        {dayPosts.length > 2 && (
                          <div className="text-xs text-slate-400 font-medium">+{dayPosts.length - 2} more</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  {[
                    { label: 'Draft',     cls: 'bg-gray-100 text-gray-600' },
                    { label: 'Scheduled', cls: 'bg-amber-100 text-amber-700' },
                    { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
                  ].map(s => (
                    <span key={s.label} className={`text-xs px-2 py-0.5 rounded font-medium ${s.cls}`}>{s.label}</span>
                  ))}
                </div>
                <span className="ml-auto text-xs text-slate-400">🎬 Video &nbsp;·&nbsp; 📷 Image &nbsp;·&nbsp; 📊 Poll &nbsp;·&nbsp; 📝 Text</span>
              </div>
            </div>

            {/* Unplanned posts strip */}
            {unplannedPosts.length > 0 && (
              <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/30 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-700">⏳ Unplanned Posts</span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{unplannedPosts.length} not scheduled</span>
                  </div>
                  <span className="text-xs text-slate-400">Click any post to add a date →</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {unplannedPosts.map(post => (
                    <div key={post.id}
                      onClick={() => startEdit(post)}
                      className="shrink-0 flex flex-col gap-1.5 p-3 rounded-lg border border-amber-200 bg-white hover:border-orange-400 hover:shadow-sm transition-all cursor-pointer min-w-[160px] max-w-[180px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{postTypeIcon(post.media_type)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[post.status]}`}>{post.status}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-tight line-clamp-2">{post.collateral}</p>
                      <p className="text-xs text-slate-400 truncate">{post.platforms}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom stats bar */}
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-3 flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs text-slate-600"><span className="font-semibold text-slate-900">{plannedCount}</span> Planned this month</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="text-xs text-slate-600"><span className="font-semibold text-slate-900">{unplannedPosts.length}</span> Unplanned</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <span className="text-xs text-slate-600"><span className="font-semibold text-slate-900">{publishedCount}</span> Published</span>
              </div>
              <button onClick={() => openCreateWithDate('')}
                className="ml-auto flex items-center gap-1.5 text-xs font-medium text-orange-600 hover:text-orange-700">
                <Plus className="h-3.5 w-3.5" /> Add post
              </button>
            </div>

          </div>
        )}

        {/* ── PUBLISH HUB TAB ──────────────────────────────────────────── */}
        {activeTab === 'platform' && (
          <div className="space-y-4">

            {/* ── LEVEL 1: Platform cards — ready to publish ── */}
            {!selectedPlatform && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Publish Hub</p>
                    <p className="text-xs text-slate-500 mt-0.5">Select a platform to publish ready posts</p>
                  </div>
                  <button onClick={() => setActiveTab('create')}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                    <Plus className="h-4 w-4" /> New Post
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALL_PLATFORMS.map(platform => {
                    const pPosts    = platformGroups[platform] ?? []
                    const ready     = pPosts.filter(p => p.status === 'scheduled')
                    const overdue   = ready.filter(p => p.scheduled_date && p.scheduled_date < todayStr)
                    const published = pPosts.filter(p => p.status === 'published').length
                    const conn      = isConnected(platform.toLowerCase())
                    const hasReady  = ready.length > 0

                    return (
                      <div key={platform}
                        onClick={() => hasReady && setSelectedPlatform(platform)}
                        className={`rounded-xl border p-5 transition-all ${
                          hasReady
                            ? 'bg-white border-gray-200 cursor-pointer hover:border-orange-300 hover:shadow-md'
                            : 'bg-gray-50 border-gray-100 opacity-60'
                        }`}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-xl ${platformColor[platform]} flex items-center justify-center text-white shadow-sm`}>
                              {platformIcon[platform]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{platform}</p>
                              <p className="text-xs text-slate-400">{published} published</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {['linkedin','facebook','instagram','tiktok'].includes(platform.toLowerCase()) && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${conn ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                {conn ? '● Connected' : '○ Not connected'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Ready to publish count */}
                        <div className={`rounded-xl p-3 text-center mb-3 ${
                          overdue.length > 0 ? 'bg-red-50 border border-red-200' :
                          hasReady ? 'bg-blue-50 border border-blue-200' :
                          'bg-gray-50 border border-gray-100'
                        }`}>
                          <p className={`text-2xl font-bold ${
                            overdue.length > 0 ? 'text-red-600' :
                            hasReady ? 'text-blue-600' : 'text-slate-400'
                          }`}>{ready.length}</p>
                          <p className={`text-xs font-medium ${
                            overdue.length > 0 ? 'text-red-500' :
                            hasReady ? 'text-blue-500' : 'text-slate-400'
                          }`}>
                            {overdue.length > 0 ? `${overdue.length} overdue!` : hasReady ? 'ready to publish' : 'nothing to publish'}
                          </p>
                        </div>

                        {/* CTA */}
                        {!conn && ['linkedin','facebook','instagram','tiktok'].includes(platform.toLowerCase()) ? (
                          <button onClick={e => {
                            e.stopPropagation()
                            if (platform.toLowerCase() === 'linkedin') setShowLinkedInManual(true)
                            else window.location.href = `/api/auth/${platform.toLowerCase()}`
                          }}
                            className="w-full py-2 text-xs font-medium text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors">
                            Connect account →
                          </button>
                        ) : hasReady ? (
                          <div className="w-full py-2 text-xs font-semibold text-center text-orange-500 border border-orange-200 rounded-lg">
                            Publish {ready.length} post{ready.length > 1 ? 's' : ''} →
                          </div>
                        ) : (
                          <div className="w-full py-2 text-xs text-center text-slate-400">
                            All caught up ✓
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ── LEVEL 2: Publish posts for selected platform ── */}
            {selectedPlatform && (() => {
              const pPosts     = platformGroups[selectedPlatform] ?? []
              const readyPosts = pPosts.filter(p => p.status === 'scheduled')
              const conn       = isConnected(selectedPlatform.toLowerCase())
              return (
                <div className="space-y-4">
                  {/* Breadcrumb */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedPlatform(null)}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-orange-600 transition-colors font-medium">
                        <ChevronLeft className="h-4 w-4" /> Publish Hub
                      </button>
                      <span className="text-slate-300">/</span>
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-lg ${platformColor[selectedPlatform]} flex items-center justify-center text-white`}>
                          {platformIcon[selectedPlatform]}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{selectedPlatform}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                          {readyPosts.length} ready
                        </span>
                      </div>
                    </div>
                    <button onClick={() => setActiveTab('create')}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                      <Plus className="h-4 w-4" /> New Post
                    </button>
                  </div>

                  {readyPosts.length === 0 ? (
                    <div className="rounded-xl border border-gray-200 bg-white py-16 text-center space-y-2">
                      <p className="text-2xl">✓</p>
                      <p className="text-sm font-semibold text-slate-700">Nothing to publish for {selectedPlatform}</p>
                      <p className="text-xs text-slate-400">Schedule posts in Post Tracker or create a new one</p>
                      <button onClick={() => setActiveTab('create')}
                        className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                        <Plus className="h-4 w-4" /> Create Post
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {readyPosts.map(post => {
                        const isOverduePost = post.scheduled_date && post.scheduled_date < todayStr
                        return (
                          <div key={post.id} className={`rounded-xl border bg-white p-5 flex items-center gap-4 hover:shadow-md transition-all ${
                            isOverduePost ? 'border-red-300 bg-red-50/20' : 'border-gray-200'
                          }`}>
                            {/* Icon */}
                            <div className="text-2xl shrink-0">{postTypeIcon(post.media_type)}</div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-semibold text-slate-800 truncate">{post.collateral}</p>
                                {isOverduePost && (
                                  <span className="shrink-0 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                    <Bell className="h-3 w-3" /> Overdue
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400 truncate">{post.caption.slice(0, 100)}{post.caption.length > 100 ? '…' : ''}</p>
                              <p className="text-xs text-slate-400 mt-1">
                                {post.scheduled_date
                                  ? `Scheduled: ${new Date(post.scheduled_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                                  : 'No date set'}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => startEdit(post)}
                                className="p-2 text-slate-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors">
                                <Pencil className="h-4 w-4" />
                              </button>
                              {conn ? (
                                <button
                                  onClick={() => publishPost(post)}
                                  disabled={publishing === post.id}
                                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
                                    isOverduePost
                                      ? 'bg-red-500 hover:bg-red-600 text-white'
                                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                                  }`}>
                                  {publishing === post.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : platformIcon[selectedPlatform]
                                  }
                                  {publishing === post.id ? 'Publishing...' : isOverduePost ? 'Publish Now!' : 'Publish'}
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic px-3">Connect account first</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

          </div>
        )}

        {/* ── CREATE / EDIT POST TAB ────────────────────────────────────── */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Templates panel */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-slate-900">Post Templates</h3>
                  <button
                    type="button"
                    onClick={() => setShowTemplateManager(v => !v)}
                    className="text-xs text-orange-500 hover:text-orange-700 font-medium flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    {showTemplateManager ? 'Done' : 'Manage'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  {dbTemplates.length > 0 ? `${activeTemplates.length} templates from CRM` : 'Using built-in templates — run migration to enable CRM templates'}
                </p>

                {/* Template manager (add/edit/delete) */}
                {showTemplateManager && (
                  <div className="mb-4 rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-700">Manage Templates</span>
                      <button type="button" onClick={openNewTemplate}
                        className="flex items-center gap-1 text-xs font-medium bg-orange-500 text-white px-2 py-1 rounded-lg hover:bg-orange-600">
                        <Plus className="h-3 w-3" /> New
                      </button>
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {dbTemplates.filter(t => t.active).map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-orange-100">
                          <span className="text-xs text-slate-700 flex-1 truncate">{t.title}</span>
                          <button type="button" onClick={() => openEditTemplate(t)} className="text-slate-400 hover:text-orange-500">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button type="button" onClick={() => { if (confirm(`Delete "${t.title}"?`)) deleteTemplate(t.id) }} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {dbTemplates.filter(t => t.active).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No templates yet — click New above</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-220px)] pr-1">
                  {activeTemplates.map((t, i) => {
                    const tDesign = t as ActiveTemplate
                    return (
                      <div key={`${t.collateral}-${i}`}
                        onClick={() => applyTemplate(t)}
                        className={`rounded-lg border cursor-pointer transition-all overflow-hidden ${
                          selectedTemplate === t.collateral
                            ? 'border-orange-500/40 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                        {/* Design thumbnail — show best available preview */}
                        {(tDesign.design_preview_url || tDesign.infographic_preview_url || tDesign.movie_preview_url || tDesign.movie_url?.startsWith('upload:')) && (
                          <div className="relative w-full h-28 bg-gray-100 overflow-hidden">
                            {tDesign.movie_url?.startsWith('upload:') && !tDesign.design_preview_url && !tDesign.infographic_preview_url && !tDesign.movie_preview_url ? (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 gap-1.5">
                                <Film className="h-7 w-7 text-emerald-400" />
                                <span className="text-[10px] text-gray-400 font-medium">Uploaded Video</span>
                              </div>
                            ) : (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img src={tDesign.design_preview_url || tDesign.infographic_preview_url || tDesign.movie_preview_url || ''} alt={t.collateral} className="w-full h-full object-cover" />
                            )}
                            {tDesign.logo_url && (
                              <div className="absolute top-2 left-2 h-7 w-7 rounded bg-white/80 backdrop-blur-sm p-0.5 shadow-sm overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={tDesign.logo_url} alt="logo" className="h-full w-full object-contain" />
                              </div>
                            )}
                            {/* Media slot badges */}
                            <div className="absolute bottom-1.5 left-1.5 flex gap-1">
                              {tDesign.design_url && (
                                <a href={tDesign.design_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-0.5 bg-[#7c3aed] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow hover:bg-[#6d28d9]">
                                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                  Image
                                </a>
                              )}
                              {tDesign.infographic_url && (
                                <a href={tDesign.infographic_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-0.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow hover:bg-blue-700">
                                  <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                                  Info
                                </a>
                              )}
                              {tDesign.movie_url && (
                                <span onClick={e => e.stopPropagation()}
                                  className="flex items-center gap-0.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                  <Film className="h-2 w-2" />
                                  Movie
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-slate-800 flex-1">{t.collateral}</p>
                            {dbTemplates.find(d => d.title === t.collateral) && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); openEditTemplate(dbTemplates.find(d => d.title === t.collateral)!) }}
                                className="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-600 hover:bg-orange-200 transition-colors"
                                title="Edit template">
                                <Pencil className="h-2.5 w-2.5" /> Edit
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 truncate">{t.platforms}</p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.caption}</p>
                          {selectedTemplate === t.collateral && (
                            <p className="text-xs text-orange-500 mt-1 font-medium flex items-center gap-1">
                              <Check className="h-3 w-3" /> Loaded
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Post form */}
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-gray-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingPost ? '✏️ Edit Post' : '✨ Create New Post'}
                  </h3>
                  {editingPost && (
                    <button onClick={() => { setEditingPost(null); setForm(emptyForm); setSelectedTemplate(null); setTemplateFields(new Set()) }}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" /> Cancel edit
                    </button>
                  )}
                </div>
                <form onSubmit={savePost} data-post-form className="space-y-3">

                  {/* ── Media slot picker + preview ── */}
                  {selectedDesign && (selectedDesign.url || selectedDesign.infographic_preview_url || selectedDesign.movie_preview_url || selectedDesign.movie_url) && (() => {
                    const slots = [
                      { key: 'image' as const,       label: 'Image',       preview: selectedDesign.url,                      editUrl: selectedDesign.design_url },
                      { key: 'infographic' as const, label: 'Infographic', preview: selectedDesign.infographic_preview_url,   editUrl: selectedDesign.infographic_url },
                      { key: 'movie' as const,       label: 'Movie',       preview: selectedDesign.movie_preview_url ?? selectedDesign.movie_url, editUrl: selectedDesign.movie_url },
                    ].filter(s => s.preview)
                    const active = slots.find(s => s.key === selectedMediaSlot) ?? slots[0]
                    return (
                      <div className="space-y-1.5">
                        {/* Media type picker — always visible */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 shrink-0">Publish as:</span>
                          {slots.map(s => (
                            <button key={s.key} type="button"
                              onClick={() => setSelectedMediaSlot(s.key)}
                              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                                selectedMediaSlot === s.key
                                  ? s.key === 'movie' ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : s.key === 'infographic' ? 'border-blue-500 bg-blue-50 text-blue-700'
                                  : 'border-orange-500 bg-orange-50 text-orange-700'
                                  : 'border-gray-200 text-slate-500 hover:border-gray-300'
                              }`}>
                              {s.key === 'movie' && <Film className="h-3 w-3" />}
                              {s.key === 'image' && <ImageIcon className="h-3 w-3" />}
                              {s.key === 'infographic' && <LayoutGrid className="h-3 w-3" />}
                              {s.label}
                            </button>
                          ))}
                        </div>
                        {/* Preview */}
                        <div className="relative w-full rounded-xl overflow-hidden border border-orange-100 bg-gray-900" style={{ aspectRatio: active.key === 'movie' ? '16/9' : '1/1' }}>
                          {active.key === 'movie' ? (() => {
                            const movieUrl = active.editUrl ?? ''
                            const isProduct = movieUrl.startsWith('product:')
                            const isAiMovie = movieUrl.startsWith('ai-movie:')
                            const isUpload  = movieUrl.startsWith('upload:')
                            if (isUpload) {
                              return (
                                // eslint-disable-next-line jsx-a11y/media-has-caption
                                <video src={movieUrl.replace('upload:', '')} controls autoPlay loop
                                  className="w-full h-full object-contain" />
                              )
                            }
                            const screenshotUrls = isProduct ? movieUrl.replace('product:', '').split('|').filter(Boolean) : []
                            const aiImageUrl = isAiMovie ? movieUrl.replace('ai-movie:', '') : ''
                            const comp = isProduct ? ProductDemoComposition : isAiMovie ? AiMovieComposition : PostVideoComposition
                            const props = isProduct
                              ? { title: form.collateral, caption: form.caption || form.background, platform: form.platforms[0] || 'LinkedIn', screenshotUrls }
                              : isAiMovie
                                ? { imageUrl: aiImageUrl, hook: form.hook || extractMovieHook(form.collateral, form.background, form.caption), caption: form.caption || form.background || '', cta: form.cta || '', platform: form.platforms[0] || 'LinkedIn' }
                                : { title: form.collateral, hook: form.hook || extractMovieHook(form.collateral, form.background, form.caption), caption: form.caption || form.background, platform: form.platforms[0] || 'LinkedIn', hashtags: form.hashtags || extractMovieHashtags(form.collateral, form.caption, form.background), aiPrompt: suggestVisualPrompt(form.collateral, form.caption, form.background) }
                            const frames = isProduct ? screenshotUrls.length * 80 + 60 : isAiMovie ? AI_MOVIE_FRAMES : 240
                            return (
                              <Player
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                component={comp as any}
                                inputProps={props}
                                durationInFrames={frames} fps={30} compositionWidth={1200} compositionHeight={628}
                                style={{ width: '100%' }} controls autoPlay loop
                              />
                            )
                          })() : (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={active.preview!} alt="Design" className="absolute inset-0 w-full h-full object-cover" />
                              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.75) 100%)' }} />
                              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                                <svg width="16" height="18" viewBox="0 0 16 18"><polygon points="0,0 16,9 0,18" fill="#f97316"/></svg>
                                <span className="text-white text-[9px] font-bold tracking-widest">AGENTS PILOT</span>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 p-4 space-y-1.5">
                                {form.hook && <p className="text-white font-bold text-sm leading-tight line-clamp-3">{form.hook}</p>}
                                {!form.hook && form.collateral && <p className="text-white font-bold text-sm leading-tight">{form.collateral}</p>}
                                {form.cta && <p className="text-[#f97316] font-semibold text-xs">{form.cta}</p>}
                                {form.caption && <p className="text-white/70 text-[10px] leading-snug line-clamp-2">{form.caption}</p>}
                              </div>
                              {active.editUrl && !active.editUrl.startsWith('remotion:') && !active.editUrl.startsWith('ai-movie:') && (
                                <a href={active.editUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                  className="absolute top-3 right-3 bg-[#7c3aed] text-white rounded px-2 py-1 text-[10px] font-bold flex items-center gap-1 shadow hover:bg-[#6d28d9] transition-colors">
                                  <ExternalLink className="h-2.5 w-2.5" /> Edit in Canva
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* ── Primary fields: Title, Date, Status ── */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Post Title <span className="text-red-500">*</span></label>
                    <input required value={form.collateral} onChange={e => { setForm(f => ({ ...f, collateral: e.target.value })); setTemplateFields(s => { const n = new Set(s); n.delete('collateral'); return n }) }}
                      placeholder="e.g. Teaser Post #1"
                      className={`${inputCls} ${templateFields.has('collateral') ? 'bg-orange-50 border-orange-200' : ''}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Schedule Date</label>
                      <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))}
                        className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Status</label>
                      <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as SocialPost['status'] }))}
                        className={inputCls}>
                        <option value="draft">Draft</option>
                        <option value="scheduled">Scheduled</option>
                        <option value="published">Published</option>
                      </select>
                    </div>
                  </div>

                  {/* ── Campaign ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Campaign <span className="text-slate-400">(optional)</span></label>
                      <select
                        value={form.campaign_id}
                        onChange={e => {
                          const newCampaignId = e.target.value
                          const LANDING = 'https://agentspilot-marketing.vercel.app/signup'
                          const buildUtm = (campId: string) => {
                            const camp = campaigns.find(c => c.id === campId)
                            if (!camp?.utm_source) {
                              const src = form.platforms[0]?.toLowerCase().replace(/\s/g, '') ?? 'social'
                              const slug = form.collateral.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'post'
                              return `${LANDING}?utm_source=${src}&utm_medium=social&utm_campaign=${slug}`
                            }
                            const p = new URLSearchParams()
                            p.set('utm_source', camp.utm_source)
                            if (camp.utm_medium)   p.set('utm_medium',   camp.utm_medium)
                            if (camp.utm_campaign) p.set('utm_campaign', camp.utm_campaign)
                            return `${LANDING}?${p.toString()}`
                          }
                          const stripUtm = (caption: string) =>
                            caption.replace(/\n+https?:\/\/[^\s]+utm_[^\s]*/g, '').trimEnd()
                          setForm(f => {
                            const cleanCaption = stripUtm(f.caption)
                            const newCaption = newCampaignId ? `${cleanCaption}\n${buildUtm(newCampaignId)}` : cleanCaption
                            return { ...f, campaign_id: newCampaignId, caption: newCaption }
                          })
                        }}
                        className={inputCls}>
                        <option value="">— No campaign —</option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.status !== 'active' ? `(${c.status})` : ''}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* ── Template-filled fields ── */}
                  {templateFields.size > 0 && (
                    <div className="text-xs text-orange-600 flex items-center gap-1.5 px-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block" />
                      Fields highlighted in orange were pre-filled from the template — edit freely
                    </div>
                  )}

                  {/* Platforms */}
                  <div className={`flex flex-col gap-1 rounded-lg p-2 -mx-2 ${templateFields.has('platforms') ? 'bg-orange-50' : ''}`}>
                    <label className="text-xs font-medium text-slate-500">Platforms</label>
                    <div className="flex flex-wrap gap-2">
                      {ALL_PLATFORMS.map(pl => (
                        <label key={pl} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                          form.platforms.includes(pl)
                            ? `${platformColor[pl]} text-white border-transparent`
                            : 'border-gray-200 text-slate-600 hover:border-gray-300'
                        }`}>
                          <input type="checkbox" className="hidden"
                            checked={form.platforms.includes(pl)}
                            onChange={e => { setForm(f => ({ ...f, platforms: e.target.checked ? [...f.platforms, pl] : f.platforms.filter(p => p !== pl) })); setTemplateFields(s => { const n = new Set(s); n.delete('platforms'); return n }) }} />
                          {pl}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className={`flex flex-col gap-1 rounded-lg p-1 -mx-1 ${templateFields.has('media_type') ? 'bg-orange-50' : ''}`}>
                      <label className="text-xs font-medium text-slate-500">Media Type</label>
                      <input value={form.media_type} onChange={e => { setForm(f => ({ ...f, media_type: e.target.value })); setTemplateFields(s => { const n = new Set(s); n.delete('media_type'); return n }) }}
                        placeholder="e.g. Short Video, Static Image" className={inputCls} />
                    </div>
                    <div className={`flex flex-col gap-1 rounded-lg p-1 -mx-1 ${templateFields.has('cta') ? 'bg-orange-50' : ''}`}>
                      <label className="text-xs font-medium text-slate-500">CTA</label>
                      <input value={form.cta} onChange={e => { setForm(f => ({ ...f, cta: e.target.value })); setTemplateFields(s => { const n = new Set(s); n.delete('cta'); return n }) }}
                        placeholder="e.g. 👉 Follow to see more" className={inputCls} />
                    </div>
                  </div>

                  {/* ── UTM confirmation strip ───────────────────────────── */}
                  {form.campaign_id && (() => {
                    const camp = campaigns.find(c => c.id === form.campaign_id)
                    if (!camp) return null
                    return (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <p className="text-xs text-emerald-700">
                          <span className="font-semibold">UTM link auto-added</span> to caption
                          {camp.utm_source && <span className="text-emerald-500 ml-1">· source: {camp.utm_source}</span>}
                          {camp.utm_campaign && <span className="text-emerald-500 ml-1">· campaign: {camp.utm_campaign}</span>}
                        </p>
                      </div>
                    )
                  })()}

                  {/* Background / Messaging */}
                  <div className={`flex flex-col gap-1 rounded-lg p-1 -mx-1 ${templateFields.has('background') ? 'bg-orange-50' : ''}`}>
                    <label className="text-xs font-medium text-slate-500">Background / Messaging</label>
                    <textarea rows={2} value={form.background} onChange={e => { setForm(f => ({ ...f, background: e.target.value })); setTemplateFields(s => { const n = new Set(s); n.delete('background'); return n }) }}
                      placeholder="The key message and context for this post..."
                      className={`${inputCls} resize-none`} />
                  </div>

                  {/* Hook */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">
                        Hook <span className="text-slate-400 font-normal">(opening line — stops the scroll)</span>
                      </label>
                      <button type="button" onClick={openHookPicker}
                        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 font-medium">
                        <BookOpen className="h-3 w-3" />
                        Pick from library
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.hook}
                      onChange={e => setForm(f => ({ ...f, hook: e.target.value }))}
                      placeholder="e.g. I lost a $40K deal because I followed up 3 days too late."
                      className={inputCls}
                    />
                    {showHookPicker && (
                      <div className="rounded-xl border border-indigo-200 bg-white shadow-lg mt-1 overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 border-b border-indigo-100">
                          <span className="text-xs font-semibold text-indigo-700">Hooks Library</span>
                          <button type="button" onClick={() => setShowHookPicker(false)} className="text-slate-400 hover:text-slate-600">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="px-3 py-2 border-b border-gray-100">
                          <input type="text" value={hookPickerSearch} onChange={e => setHookPickerSearch(e.target.value)}
                            placeholder="Search hooks…"
                            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div className="max-h-52 overflow-y-auto divide-y divide-gray-50">
                          {hookPickerLoading ? (
                            <div className="flex items-center justify-center py-6 text-slate-400 gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                            </div>
                          ) : hookPickerItems.filter(h => !hookPickerSearch || h.text.toLowerCase().includes(hookPickerSearch.toLowerCase())).length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-6">No hooks found</p>
                          ) : hookPickerItems
                              .filter(h => !hookPickerSearch || h.text.toLowerCase().includes(hookPickerSearch.toLowerCase()))
                              .map(h => (
                                <button key={h.id} type="button"
                                  onClick={() => { setForm(f => ({ ...f, hook: h.text })); setShowHookPicker(false); setHookPickerSearch('') }}
                                  className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors">
                                  <p className="text-xs text-slate-800 leading-relaxed">{h.text}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-indigo-500 font-medium">{h.category}</span>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-xs text-slate-400">{h.platform}</span>
                                    <span className="text-slate-300">·</span>
                                    <span className="text-xs text-amber-500">★ {h.avg_score}</span>
                                  </div>
                                </button>
                              ))
                          }
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Caption */}
                  <div className={`flex flex-col gap-1 rounded-lg p-1 -mx-1 ${templateFields.has('caption') ? 'bg-orange-50' : ''}`}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">Post Body <span className="text-red-500">*</span></label>
                      <button type="button" onClick={() => setUseAI(v => !v)}
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600">
                        <Sparkles className="h-3 w-3" />
                        {useAI ? 'Hide AI' : 'Generate with AI'}
                      </button>
                    </div>
                    {useAI && (
                      <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2 mb-1">
                        <textarea rows={2} value={aiBrief} onChange={e => setAiBrief(e.target.value)}
                          placeholder="Brief: what should this post be about?"
                          className="w-full px-3 py-2 text-xs border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
                        <div className="grid grid-cols-2 gap-2">
                          <select value={aiPlatform} onChange={e => setAiPlatform(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-orange-200 rounded-lg bg-white focus:outline-none">
                            {['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Website'].map(p => <option key={p}>{p}</option>)}
                          </select>
                          <select value={aiTone} onChange={e => setAiTone(e.target.value)}
                            className="px-2 py-1.5 text-xs border border-orange-200 rounded-lg bg-white focus:outline-none">
                            {['Professional', 'Casual', 'Bold', 'Inspirational'].map(t => <option key={t}>{t}</option>)}
                          </select>
                        </div>
                        {aiError && <p className="text-xs text-red-600">{aiError}</p>}
                        <button type="button" onClick={generateWithAI} disabled={aiLoading || !aiBrief.trim()}
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                          {aiLoading ? <><RefreshCw className="h-3 w-3 animate-spin" /> Generating…</> : <><Sparkles className="h-3 w-3" /> Generate Caption & CTA</>}
                        </button>
                      </div>
                    )}
                    <textarea required rows={5} value={form.caption} onChange={e => { setForm(f => ({ ...f, caption: e.target.value })); setTemplateFields(s => { const n = new Set(s); n.delete('caption'); return n }) }}
                      placeholder="Write or generate caption…"
                      className={`${inputCls} resize-none font-mono text-xs`} />
                    <p className="text-xs text-slate-400">{form.caption.length} chars</p>
                  </div>

                  {/* ── Hashtags ──────────────────────────────────────── */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-500">Hashtags</label>
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, hashtags: suggestHashtags(f.collateral, f.caption, f.platforms) }))}
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-600">
                        <Hash className="h-3 w-3" />
                        Suggest
                      </button>
                    </div>
                    <input
                      value={form.hashtags}
                      onChange={e => setForm(f => ({ ...f, hashtags: e.target.value }))}
                      placeholder="#realestate #realtor #proptech"
                      className={inputCls} />
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(HASHTAG_GROUPS).map(([label, tags]) => (
                        <button key={label} type="button"
                          onClick={() => setForm(f => {
                            const existing = new Set(f.hashtags.split(/\s+/).filter(Boolean))
                            tags.forEach(t => existing.add(t))
                            return { ...f, hashtags: [...existing].join(' ') }
                          })}
                          className="px-2 py-1 text-xs rounded-full border border-slate-200 text-slate-500 hover:border-orange-300 hover:text-orange-600 hover:bg-orange-50 transition-all">
                          + {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Add to Nurture Library ─────────────────────────── */}
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.add_to_library}
                        onChange={e => setForm(f => ({ ...f, add_to_library: e.target.checked }))}
                        className="h-4 w-4 rounded accent-emerald-500"
                      />
                      <span className="text-sm font-semibold text-emerald-800">📚 Add to Posts Library</span>
                      <span className="text-xs text-emerald-600">— send this post to contacts in pipeline</span>
                    </label>
                    {form.add_to_library && (
                      <div>
                        <p className="text-xs font-medium text-emerald-700 mb-2">Tag for pipeline stage(s):</p>
                        <div className="flex flex-wrap gap-2">
                          {PIPELINE_STAGES.map(stage => (
                            <label key={stage} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                              form.library_stages.includes(stage)
                                ? 'bg-emerald-500 text-white border-transparent'
                                : 'bg-white border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                            }`}>
                              <input type="checkbox" className="hidden"
                                checked={form.library_stages.includes(stage)}
                                onChange={e => setForm(f => ({
                                  ...f,
                                  library_stages: e.target.checked
                                    ? [...f.library_stages, stage]
                                    : f.library_stages.filter(s => s !== stage)
                                }))}
                              />
                              {stage}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <button type="button" onClick={() => { setForm(emptyForm); setSelectedTemplate(null); setEditingPost(null); setSelectedDesign(null) }}
                      className="px-4 py-2 text-sm text-slate-600 border border-gray-200 rounded-lg hover:bg-gray-50">Clear</button>
                    <div className="flex gap-2">
                      {(selectedDesign?.url || form.caption) && (
                        <button type="button" onClick={() => setShowPostPreview(true)}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50">
                          <Eye className="h-3.5 w-3.5" /> Preview
                        </button>
                      )}
                      <button type="submit" disabled={saving || saved}
                        className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-lg transition-colors ${
                          saved ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
                          'bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50'
                        }`}>
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        {saved ? <><Check className="h-3.5 w-3.5" /> Posted!</> :
                         saving ? 'Saving...' : editingPost ? 'Save Changes' : 'Create Post'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ── POST TRACKER TAB ─────────────────────────────────────────────── */}
        {activeTab === 'tracker' && (
          <div className="py-2">
            <PostTrackerTable showHeader={false} onEditPost={async (postId) => {
              const { data } = await supabase.from('social_posts').select('*').eq('id', postId).single()
              if (data) startEdit(data)
            }} />
          </div>
        )}

      </div>

      {/* ── Day Picker / Quick Schedule Modal ───────────────────────────────── */}
      {dayPickerDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Schedule a post</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(dayPickerDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setDayPickerDate(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Template list */}
            <div className="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Pick a template — saves instantly</p>
              {activeTemplates.map((t, i) => (
                <button
                  key={`${t.collateral}-${i}`}
                  disabled={dayPickerSaving}
                  onClick={() => quickSchedule(t, dayPickerDate)}
                  className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50/40 transition-all text-left disabled:opacity-50 group">
                  <span className="text-xl mt-0.5">{postTypeIcon(t.media_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-orange-700">{t.collateral}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{t.media_type} · {t.platforms}</p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{t.caption}</p>
                  </div>
                  <span className="text-xs text-orange-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">Schedule →</span>
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                disabled={dayPickerSaving}
                onClick={() => { setDayPickerDate(null); openCreateWithDate(dayPickerDate) }}
                className="text-xs text-slate-500 hover:text-orange-600 font-medium transition-colors">
                ✏️ Write from scratch instead
              </button>
              {dayPickerSaving && (
                <div className="flex items-center gap-1.5 text-xs text-orange-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Post Preview Modal ──────────────────────────────────────────────── */}
      {showPostPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Eye className="h-4 w-4 text-orange-400" /> Post Preview
              </h3>
              <button onClick={() => setShowPostPreview(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {(() => {
                const movieUrl = selectedDesign?.movie_url ?? ''
                const isMovieSlot = selectedMediaSlot === 'movie'
                const isProduct  = movieUrl.startsWith('product:')
                const isAiMovie  = movieUrl.startsWith('ai-movie:')
                const isUpload   = movieUrl.startsWith('upload:')
                const isRemotion = movieUrl.startsWith('remotion:')
                const screenshotUrls = isProduct ? movieUrl.replace('product:', '').split('|').filter(Boolean) : []
                const aiImageUrl = isAiMovie ? movieUrl.replace('ai-movie:', '') : ''
                const uploadVideoUrl = isUpload ? movieUrl.replace('upload:', '') : ''

                const previewUrl = selectedMediaSlot === 'infographic' ? selectedDesign?.infographic_preview_url
                  : isMovieSlot ? null   // movie uses player, not img
                  : selectedDesign?.url
                const editUrl = selectedMediaSlot === 'infographic' ? selectedDesign?.infographic_url
                  : isMovieSlot ? (isRemotion || isAiMovie || isProduct || isUpload ? null : movieUrl)
                  : selectedDesign?.design_url

                const hasMedia = previewUrl || isMovieSlot
                return (
              <div className={`grid gap-5 ${hasMedia ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Design side */}
                {hasMedia && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Design · {selectedMediaSlot}</p>
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      {isMovieSlot ? (
                        isUpload ? (
                          // eslint-disable-next-line jsx-a11y/media-has-caption
                          <video src={uploadVideoUrl} controls autoPlay className="w-full" />
                        ) : (
                          <Player
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            component={(isProduct ? ProductDemoComposition : isAiMovie ? AiMovieComposition : PostVideoComposition) as any}
                            inputProps={
                              isProduct ? { title: form.collateral, caption: form.caption || form.background, platform: form.platforms[0] || 'LinkedIn', screenshotUrls }
                              : isAiMovie ? { imageUrl: aiImageUrl, hook: form.hook || extractMovieHook(form.collateral, form.background, form.caption), caption: form.caption || form.background || '', cta: form.cta || '', platform: form.platforms[0] || 'LinkedIn' }
                              : { title: form.collateral, hook: form.hook || extractMovieHook(form.collateral, form.background, form.caption), caption: form.caption || form.background || '', platform: form.platforms[0] || 'LinkedIn', hashtags: form.hashtags || extractMovieHashtags(form.collateral, form.caption, form.background), aiPrompt: suggestVisualPrompt(form.collateral, form.caption, form.background) }
                            }
                            durationInFrames={isProduct ? screenshotUrls.length * 80 + 60 : isAiMovie ? AI_MOVIE_FRAMES : 240}
                            fps={30} compositionWidth={1200} compositionHeight={628}
                            style={{ width: '100%' }} controls autoPlay loop
                          />
                        )
                      ) : (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={previewUrl!} alt="Post design" className="w-full object-cover" />
                      )}
                    </div>
                    {editUrl && !isMovieSlot && (
                      <a href={editUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                        <ExternalLink className="h-3 w-3" /> Edit in Canva
                      </a>
                    )}
                  </div>
                )}
                {/* Caption side */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Post Details</p>
                  {form.collateral && (
                    <p className="text-sm font-semibold text-slate-800">{form.collateral}</p>
                  )}
                  {form.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {form.platforms.map(p => (
                        <span key={p} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{p}</span>
                      ))}
                    </div>
                  )}
                  {form.media_type && (
                    <p className="text-xs text-slate-500">📎 {form.media_type}</p>
                  )}
                  {form.hook && (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
                      <p className="text-xs font-semibold text-orange-600 mb-1">Hook</p>
                      <p className="text-sm text-orange-800 whitespace-pre-wrap leading-relaxed">{form.hook}</p>
                    </div>
                  )}
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-slate-400 mb-2">Caption</p>
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{form.caption || '(no caption yet)'}</p>
                  </div>
                  {form.hashtags && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                      <p className="text-xs font-semibold text-blue-500 mb-1">Hashtags</p>
                      <p className="text-sm text-blue-700 font-mono">{form.hashtags}</p>
                    </div>
                  )}
                  {form.cta && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <p className="text-xs font-semibold text-emerald-600 mb-1">CTA</p>
                      <p className="text-sm text-emerald-800">{form.cta}</p>
                    </div>
                  )}
                  {form.scheduled_date && (
                    <p className="text-xs text-slate-500">📅 Scheduled: {form.scheduled_date}</p>
                  )}
                </div>
              </div>
                )})()}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowPostPreview(false)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">Edit</button>
              <button
                onClick={() => { setShowPostPreview(false); document.querySelector<HTMLFormElement>('form[data-post-form]')?.requestSubmit() }}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                <Check className="h-3.5 w-3.5" />
                {editingPost ? 'Approve & Save' : 'Approve & Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template Add/Edit Modal ─────────────────────────────────────────── */}
      {showTemplateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-slate-900">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <button type="button" onClick={() => setShowTemplateForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={saveTemplate} className="p-6 space-y-3 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Title <span className="text-red-500">*</span></label>
                <input required value={templateForm.title}
                  onChange={e => setTemplateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Teaser Post #1"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Platforms</label>
                  <input value={templateForm.platforms}
                    onChange={e => setTemplateForm(f => ({ ...f, platforms: e.target.value }))}
                    placeholder="LinkedIn, Facebook"
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Media Type</label>
                  <input value={templateForm.media_type}
                    onChange={e => setTemplateForm(f => ({ ...f, media_type: e.target.value }))}
                    placeholder="Short Video, Static Image…"
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Background / Messaging Brief</label>
                <textarea rows={2} value={templateForm.background}
                  onChange={e => setTemplateForm(f => ({ ...f, background: e.target.value }))}
                  placeholder="The key message and context for this post…"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">CTA</label>
                <input value={templateForm.cta}
                  onChange={e => setTemplateForm(f => ({ ...f, cta: e.target.value }))}
                  placeholder="👉 Click here to…"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Post Caption <span className="text-red-500">*</span></label>
                <textarea required rows={4} value={templateForm.caption}
                  onChange={e => setTemplateForm(f => ({ ...f, caption: e.target.value }))}
                  placeholder="Write the full caption…"
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none font-mono text-xs" />
                <p className="text-xs text-slate-400">{templateForm.caption.length} chars</p>
              </div>
              {/* ── Design section ── */}
              <div className="border-t border-gray-100 pt-3 space-y-3">
                <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5"><ImageIcon className="h-3.5 w-3.5 text-orange-400" /> Design Template</p>

                {/* Logo */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Brand Logo <span className="text-slate-400">(top-left on image)</span></label>
                  <div className="flex items-center gap-3">
                    {templateForm.logo_url ? (
                      <div className="relative h-10 w-10 rounded border border-gray-200 bg-gray-50 overflow-hidden shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={templateForm.logo_url} alt="Logo" className="h-full w-full object-contain p-1" />
                        <button type="button" onClick={() => setTemplateForm(f => ({ ...f, logo_url: '' }))}
                          className="absolute -top-1 -right-1 bg-white rounded-full shadow p-0.5 hover:bg-red-50">
                          <X className="h-2.5 w-2.5 text-slate-400" />
                        </button>
                      </div>
                    ) : null}
                    <label className={`flex items-center gap-2 px-3 py-2 text-xs border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${designUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {designUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" /> : <Upload className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="text-slate-500">{templateForm.logo_url ? 'Replace logo' : 'Upload logo'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const url = await uploadDesignImage(file)
                          if (url) setTemplateForm(f => ({ ...f, logo_url: url }))
                        }} />
                    </label>
                    <span className="text-xs text-slate-400">or</span>
                    <input value={templateForm.logo_url}
                      onChange={e => setTemplateForm(f => ({ ...f, logo_url: e.target.value }))}
                      placeholder="https://… logo URL"
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                {/* AI Visual Prompt */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-orange-400" />
                      AI Visual Prompt
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button type="button"
                        onClick={() => setTemplateForm(f => ({ ...f, design_prompt: suggestVisualPrompt(f.title, f.caption, f.background) }))}
                        className="text-xs text-violet-500 hover:text-violet-600 flex items-center gap-1 px-2 py-0.5 rounded-md border border-violet-200 hover:bg-violet-50 transition-colors">
                        <RefreshCw className="h-3 w-3" /> Suggest
                      </button>
                      {templateForm.design_prompt && (
                        <button type="button" onClick={() => navigator.clipboard.writeText(buildEnrichedPrompt())}
                          className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copy
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea rows={4} value={templateForm.design_prompt}
                    onChange={e => setTemplateForm(f => ({ ...f, design_prompt: e.target.value }))}
                    placeholder="Describe the visual concept: mood, color palette, composition, style. E.g. 'Cinematic chaos — tangled cables and broken gears on deep crimson background, dramatic lighting. Overwhelm and frustration.'"
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-slate-600 leading-relaxed" />
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-400 flex-1">Drives image palette, movie atmosphere, and infographic colors. Each template can have its own visual world.</p>
                    {templateForm.design_prompt && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 shrink-0">
                        {parsePalette(templateForm.design_prompt) === SVG_PALETTES.crimson ? '🔴 Crimson'
                          : parsePalette(templateForm.design_prompt) === SVG_PALETTES.electric ? '🔵 Electric'
                          : parsePalette(templateForm.design_prompt) === SVG_PALETTES.emerald ? '🟢 Emerald'
                          : parsePalette(templateForm.design_prompt) === SVG_PALETTES.premium ? '🟣 Premium'
                          : parsePalette(templateForm.design_prompt) === SVG_PALETTES.warm ? '🟡 Warm'
                          : parsePalette(templateForm.design_prompt) === SVG_PALETTES.slate ? '⚪ Slate'
                          : '🟠 Brand'}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Media slots ── */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500">Media</label>

                  {/* Tab selector */}
                  <div className="flex gap-1.5">
                    {([
                      { key: 'image' as const,       label: 'Image',       dot: templateForm.design_preview_url },
                      { key: 'infographic' as const, label: 'Infographic', dot: templateForm.infographic_preview_url },
                      { key: 'movie' as const,       label: 'Movie',       dot: templateForm.movie_preview_url },
                    ]).map(tab => (
                      <button key={tab.key} type="button"
                        onClick={() => setDesignTab(d => d === tab.key ? null : tab.key)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                          designTab === tab.key
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-gray-200 text-slate-500 hover:border-gray-300 hover:text-slate-700'
                        }`}>
                        {tab.label}
                        {tab.dot && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
                      </button>
                    ))}
                  </div>

                  {/* ── Image slot ── */}
                  {designTab === 'image' && (
                    <div className="flex gap-3 p-3 rounded-xl border border-orange-100 bg-orange-50">
                      {/* Thumbnail */}
                      <div className="relative w-28 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                        {templateForm.design_preview_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={templateForm.design_preview_url} alt="preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setTemplateForm(f => ({ ...f, design_preview_url: '', design_url: '' }))}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50">
                              <X className="h-3 w-3 text-slate-500" />
                            </button>
                            {templateForm.design_url && (
                              <a href={templateForm.design_url} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="absolute bottom-1 left-1 bg-[#7c3aed] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                Edit in Canva
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400">No image</span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 grid grid-cols-2 gap-1.5">
                        <button type="button"
                          onClick={async () => {
                            if (!editingTemplate) return
                            setTemplateDesignGenerating('post')
                            const query = [templateForm.title, templateForm.background, templateForm.cta, templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)].filter(Boolean).join('. ')
                            const res = await fetch('/api/canva-queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ template_id: editingTemplate.id, title: templateForm.title, query }) })
                            const d = await res.json()
                            if (d.job_id) { setSuccess('Queued — type "canva" in Claude Code'); setTimeout(() => setSuccess(null), 8000) }
                            else setError(d.error ?? 'Failed')
                            setTemplateDesignGenerating(null)
                          }}
                          disabled={templateDesignGenerating === 'post' || !editingTemplate}
                          className="flex items-center gap-1 px-2 py-2 rounded-lg border border-emerald-400 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-xs font-semibold transition-colors">
                          {templateDesignGenerating === 'post' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Claude Image
                        </button>

                        <button type="button"
                          onClick={() => {
                            const prompt = templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)
                            setClaudeDesignPrompt([templateForm.title && `Title: ${templateForm.title}`, templateForm.cta && `CTA: ${templateForm.cta}`, templateForm.caption && `Caption: ${templateForm.caption}`, prompt && `Visual prompt: ${prompt}`].filter(Boolean).join('\n\n'))
                          }}
                          className="flex items-center gap-1 px-2 py-2 rounded-lg border border-violet-400 text-violet-700 bg-violet-50 hover:bg-violet-100 text-xs font-semibold transition-colors">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>
                          Claude Design
                        </button>

                        <button type="button" onClick={generateWithFlux} disabled={fluxGenerating}
                          className="flex items-center gap-1 px-2 py-2 rounded-lg border border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-xs font-semibold transition-colors">
                          {fluxGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                          Flux AI
                        </button>

                        <label className={`flex items-center gap-1 px-2 py-2 rounded-lg border border-gray-300 text-slate-600 bg-white hover:bg-gray-50 cursor-pointer text-xs font-semibold transition-colors ${designUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                          {designUploading ? <Loader2 className="h-3 w-3 animate-spin text-orange-400" /> : <Upload className="h-3 w-3" />}
                          Upload
                          <input type="file" accept="image/*" className="hidden"
                            onChange={async e => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const url = await uploadDesignImage(file)
                              if (url) setTemplateForm(f => ({ ...f, design_preview_url: url, design_url: '' }))
                            }} />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Claude Design prompt panel */}
                  {designTab === 'image' && claudeDesignPrompt && (
                    <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 space-y-2">
                      <p className="text-[10px] font-semibold text-violet-700 uppercase tracking-wide">Copy → paste into Claude.ai</p>
                      <pre className="text-xs text-violet-900 whitespace-pre-wrap leading-relaxed font-sans">{claudeDesignPrompt}</pre>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { navigator.clipboard?.writeText(claudeDesignPrompt); setSuccess('Copied!'); setTimeout(() => setSuccess(null), 2000) }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors">
                          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                          Copy
                        </button>
                        <a href="https://claude.ai/design/p/57c00f4a-b6b8-4232-8631-bc8507cc3840?file=AgentsPilot+Social+Post.html"
                          target="_blank" rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 rounded border border-violet-400 text-violet-700 text-xs font-semibold hover:bg-violet-100 transition-colors">
                          Open Claude Design →
                        </a>
                        <button type="button" onClick={() => setClaudeDesignPrompt(null)} className="ml-auto text-violet-400 hover:text-violet-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Infographic slot ── */}
                  {designTab === 'infographic' && (
                    <div className="flex gap-3 p-3 rounded-xl border border-blue-100 bg-blue-50">
                      {/* Thumbnail */}
                      <div className="relative w-28 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                        {templateForm.infographic_preview_url ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={templateForm.infographic_preview_url} alt="infographic preview" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => setTemplateForm(f => ({ ...f, infographic_preview_url: '', infographic_url: '' }))}
                              className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50">
                              <X className="h-3 w-3 text-slate-500" />
                            </button>
                            {templateForm.infographic_url && (
                              <a href={templateForm.infographic_url} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="absolute bottom-1 left-1 bg-[#7c3aed] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                Edit in Canva
                              </a>
                            )}
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-400 text-center px-1">No infographic</span>
                        )}
                      </div>

                      {/* Controls */}
                      <div className="flex-1 space-y-2">
                        <input
                          type="url"
                          placeholder="Paste Canva template URL…"
                          value={canvaTemplateUrl}
                          onChange={e => setCanvaTemplateUrl(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        />
                        <button type="button"
                          disabled={!canvaTemplateUrl.trim() || !editingTemplate || infographicQueuing}
                          onClick={async () => {
                            if (!editingTemplate || !canvaTemplateUrl.trim()) return
                            setInfographicQueuing(true)
                            try {
                              const res = await fetch('/api/canva-queue', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ template_id: editingTemplate.id, title: templateForm.title, query: [templateForm.title, templateForm.background, templateForm.cta, templateForm.caption].filter(Boolean).join('. '), design_type: 'infographic', canva_template_url: canvaTemplateUrl.trim() }),
                              })
                              const d = await res.json()
                              if (d.job_id) { setSuccess('Queued — type "infographic" in Claude Code'); setCanvaTemplateUrl('') }
                            } finally { setInfographicQueuing(false) }
                          }}
                          className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
                          {infographicQueuing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                          Queue infographic
                        </button>
                        <p className="text-[10px] text-blue-400">Then type <code className="font-mono">infographic</code> in Claude Code</p>
                      </div>
                    </div>
                  )}

                  {/* ── Movie slot ── */}
                  {designTab === 'movie' && (
                    <div className="space-y-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50">

                      {/* Mode selector */}
                      <div className="flex gap-1.5">
                        {([
                          { key: 'basic' as const,   label: '⚡ Basic',        desc: 'Animated text & brand' },
                          { key: 'ai' as const,      label: '🎬 AI Movie',     desc: 'People & scenes' },
                          { key: 'product' as const, label: '📱 Product Demo', desc: 'Screenshot animation' },
                          { key: 'upload' as const,  label: '⬆️ Upload',       desc: 'Loom / screen rec' },
                        ]).map(m => (
                          <button key={m.key} type="button"
                            onClick={() => setMovieMode(m.key)}
                            className={`flex-1 flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg border text-xs font-semibold transition-all ${
                              movieMode === m.key
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                                : 'bg-white text-slate-600 border-gray-200 hover:border-emerald-300'
                            }`}>
                            <span>{m.label}</span>
                            <span className={`text-[9px] font-normal ${movieMode === m.key ? 'text-emerald-100' : 'text-slate-400'}`}>{m.desc}</span>
                          </button>
                        ))}
                      </div>

                      {/* Thumbnail strip */}
                      {templateForm.movie_preview_url && (
                        <div className="relative w-full h-20 rounded-lg overflow-hidden bg-gray-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={templateForm.movie_preview_url} alt="movie preview" className="w-full h-full object-cover" />
                          <button type="button"
                            onClick={() => setTemplateForm(f => ({ ...f, movie_preview_url: '', movie_url: '' }))}
                            className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow hover:bg-red-50">
                            <X className="h-3 w-3 text-slate-500" />
                          </button>
                        </div>
                      )}

                      {/* ── Basic mode ── */}
                      {movieMode === 'basic' && (
                        <div className="space-y-2">
                          {/* Editable text fields */}
                          <div className="space-y-1.5 p-2.5 rounded-lg bg-white border border-gray-200">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Customize text</p>
                            <input
                              value={movieEditHook || extractMovieHook(templateForm.title, templateForm.background, templateForm.caption)}
                              onChange={e => setMovieEditHook(e.target.value)}
                              placeholder="Hook / headline…"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400"
                            />
                            <textarea
                              rows={2}
                              value={movieEditCaption || templateForm.caption || templateForm.background}
                              onChange={e => setMovieEditCaption(e.target.value)}
                              placeholder="Caption / body text…"
                              className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 resize-none"
                            />
                          </div>
                          <div className="rounded-lg overflow-hidden bg-black">
                            <Player
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              component={PostVideoComposition as any}
                              inputProps={{
                                title: templateForm.title,
                                hook: movieEditHook || extractMovieHook(templateForm.title, templateForm.background, templateForm.caption),
                                caption: movieEditCaption || templateForm.caption || templateForm.background || '',
                                platform: templateForm.platforms?.split(',')[0]?.trim() || 'LinkedIn',
                                hashtags: extractMovieHashtags(templateForm.title, templateForm.caption, templateForm.background),
                                aiPrompt: templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background),
                              }}
                              durationInFrames={240} fps={30} compositionWidth={1200} compositionHeight={628}
                              style={{ width: '100%' }} controls autoPlay loop
                            />
                          </div>
                          <button type="button" disabled={!editingTemplate || movieGenerating} onClick={generateMovie}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                            {movieGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3" />}
                            {movieGenerating ? 'Generating…' : 'Save Basic Movie'}
                          </button>
                        </div>
                      )}

                      {/* ── AI Movie mode ── */}
                      {movieMode === 'ai' && (
                        <div className="space-y-2">
                          {/* Existing ai-movie preview */}
                          {templateForm.movie_url?.startsWith('ai-movie:') && (
                            <Player
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              component={AiMovieComposition as any}
                              inputProps={{
                                imageUrl: templateForm.movie_url.replace('ai-movie:', ''),
                                hook: movieEditHook || extractMovieHook(templateForm.title, templateForm.background, templateForm.caption),
                                caption: movieEditCaption || templateForm.caption || templateForm.background || '',
                                cta: templateForm.cta || '',
                                platform: templateForm.platforms?.split(',')[0]?.trim() || 'LinkedIn',
                              }}
                              durationInFrames={AI_MOVIE_FRAMES} fps={30} compositionWidth={1200} compositionHeight={628}
                              style={{ width: '100%' }} controls autoPlay loop
                            />
                          )}
                          <div className="rounded-xl bg-white border border-gray-200 p-3 space-y-2">
                            <p className="text-xs font-semibold text-slate-700">AI-animated movie — free, instant</p>
                            <p className="text-[10px] text-slate-500">Generates an AI image from your visual prompt, then animates it with Ken Burns + cinematic text overlays. No video credits needed.</p>
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2">
                              <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wide mb-0.5">Visual prompt</p>
                              <p className="text-[10px] text-slate-600 font-mono line-clamp-2">{(templateForm.design_prompt || suggestVisualPrompt(templateForm.title, templateForm.caption, templateForm.background)).slice(0, 180)}</p>
                            </div>
                          </div>
                          <button type="button" disabled={!editingTemplate || aiMovieGenerating} onClick={generateAiMovie}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 transition-colors">
                            {aiMovieGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                            {aiMovieGenerating ? 'Generating image…' : templateForm.movie_url?.startsWith('ai-movie:') ? 'Regenerate AI Movie' : 'Generate AI Movie'}
                          </button>
                        </div>
                      )}

                      {/* ── Product Demo mode ── */}
                      {movieMode === 'product' && (
                        <div className="space-y-2">
                          {/* Screenshot grid — up to 3 slots */}
                          <div className="grid grid-cols-3 gap-2">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="relative aspect-video rounded-lg overflow-hidden border bg-gray-100">
                                {productScreenshots[i] ? (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={productScreenshots[i]} alt={`screen ${i+1}`} className="w-full h-full object-cover" />
                                    <button type="button"
                                      onClick={() => setProductScreenshots(prev => prev.filter((_, idx) => idx !== i))}
                                      className="absolute top-0.5 right-0.5 bg-white rounded-full p-0.5 shadow hover:bg-red-50">
                                      <X className="h-2.5 w-2.5 text-slate-500" />
                                    </button>
                                    <span className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[9px] font-bold px-1 rounded">{i + 1}</span>
                                  </>
                                ) : (
                                  <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-orange-50 transition-colors border-2 border-dashed border-orange-200 rounded-lg">
                                    {productScreenshotUploading && i === productScreenshots.length ? (
                                      <Loader2 className="h-4 w-4 text-orange-400 animate-spin" />
                                    ) : (
                                      <>
                                        <Upload className="h-3.5 w-3.5 text-orange-300" />
                                        <span className="text-[9px] text-orange-400 mt-0.5">Screen {i + 1}</span>
                                      </>
                                    )}
                                    <input type="file" accept="image/*" className="hidden"
                                      disabled={productScreenshots.length !== i}
                                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadProductScreenshot(f) }} />
                                  </label>
                                )}
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-orange-500 text-center">Add up to 3 screens — each gets its own animated scene</p>

                          {/* Live preview */}
                          {productScreenshots.length > 0 && (
                            <div className="rounded-lg overflow-hidden bg-black">
                              <Player
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                component={ProductDemoComposition as any}
                                inputProps={{ title: templateForm.title, caption: templateForm.caption || templateForm.background || '', platform: templateForm.platforms?.split(',')[0]?.trim() || 'LinkedIn', screenshotUrls: productScreenshots }}
                                durationInFrames={productScreenshots.length * 80 + 60} fps={30} compositionWidth={1200} compositionHeight={628}
                                style={{ width: '100%' }} controls autoPlay loop
                              />
                            </div>
                          )}

                          <button type="button"
                            disabled={!editingTemplate || productScreenshots.length === 0 || movieGenerating}
                            onClick={generateProductMovie}
                            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
                            {movieGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Film className="h-3 w-3" />}
                            {movieGenerating ? 'Saving…' : `Save Product Demo${productScreenshots.length > 1 ? ` (${productScreenshots.length} screens)` : ''}`}
                          </button>
                        </div>
                      )}

                      {/* ── Upload mode ── */}
                      {movieMode === 'upload' && (
                        <div className="space-y-2">
                          {/* Preview existing upload */}
                          {templateForm.movie_url?.startsWith('upload:') && (
                            <div className="rounded-xl overflow-hidden bg-black border border-gray-200">
                              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                              <video
                                src={templateForm.movie_url.replace('upload:', '')}
                                controls className="w-full" style={{ maxHeight: 200 }}
                              />
                            </div>
                          )}
                          <label className={`w-full flex flex-col items-center justify-center gap-2 px-4 py-8 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${movieUploading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'}`}>
                            {movieUploading ? (
                              <>
                                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                                <span className="text-xs font-semibold text-emerald-600">Uploading…</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-6 w-6 text-gray-400" />
                                <span className="text-xs font-semibold text-slate-600">
                                  {templateForm.movie_url?.startsWith('upload:') ? 'Replace video' : 'Upload video'}
                                </span>
                                <span className="text-[10px] text-slate-400">MP4, MOV, WebM — Loom exports, screen recordings, etc.</span>
                              </>
                            )}
                            <input
                              type="file" accept="video/mp4,video/quicktime,video/webm,video/*"
                              className="hidden" disabled={movieUploading}
                              onChange={e => { const f = e.target.files?.[0]; if (f) uploadMovie(f) }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Sort Order</label>
                <input type="number" value={templateForm.sort_order}
                  onChange={e => setTemplateForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 w-24" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowTemplateForm(false)}
                  className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={templateSaving}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                  {templateSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTemplate ? 'Save Changes' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Canva Design Picker Modal ────────────────────────────────────────── */}
      {showCanvaPicker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#7c3aed]"><circle cx="12" cy="12" r="10"/><path fill="white" d="M12 6a6 6 0 100 12A6 6 0 0012 6zm0 10a4 4 0 110-8 4 4 0 010 8z"/></svg>
                <h3 className="text-sm font-semibold text-slate-900">Pick from Canva</h3>
                <span className="text-xs text-slate-400">{canvaDesigns.length} designs</span>
              </div>
              <button onClick={() => setShowCanvaPicker(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="px-6 py-3 border-b border-gray-100">
              <input
                value={canvaSearchQuery}
                onChange={e => setCanvaSearchQuery(e.target.value)}
                placeholder="Search designs…"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/40"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-4">
              <div className="grid grid-cols-3 gap-3">
                {canvaDesigns
                  .filter(d => !canvaSearchQuery || d.title.toLowerCase().includes(canvaSearchQuery.toLowerCase()))
                  .map(design => (
                    <button
                      key={design.id}
                      type="button"
                      onClick={() => {
                        setTemplateForm(f => ({ ...f, design_preview_url: design.thumbnail, design_url: design.edit_url }))
                        setShowCanvaPicker(false)
                        setCanvaSearchQuery('')
                      }}
                      className="group rounded-xl border border-gray-200 overflow-hidden hover:border-[#7c3aed] hover:shadow-md transition-all text-left">
                      <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={design.thumbnail} alt={design.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        <div className="absolute inset-0 bg-[#7c3aed]/0 group-hover:bg-[#7c3aed]/10 transition-colors flex items-center justify-center">
                          <span className="opacity-0 group-hover:opacity-100 bg-[#7c3aed] text-white text-xs font-medium px-3 py-1.5 rounded-full transition-opacity">
                            Select
                          </span>
                        </div>
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-tight">{design.title || 'Untitled'}</p>
                      </div>
                    </button>
                  ))}
              </div>
              {canvaDesigns.filter(d => !canvaSearchQuery || d.title.toLowerCase().includes(canvaSearchQuery.toLowerCase())).length === 0 && (
                <p className="text-center text-sm text-slate-400 py-10">No designs match "{canvaSearchQuery}"</p>
              )}
            </div>
            <div className="border-t border-gray-100 px-6 py-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">Designs synced from your Canva account</p>
              <button
                type="button"
                onClick={() => setShowCanvaPicker(false)}
                className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 border border-gray-200 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Movie Preview Modal ──────────────────────────────────────────────── */}
      {movieTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111] rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden flex flex-col border border-[#222]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-white">Post Movie Preview</h3>
                <span className="text-xs text-zinc-500">— {movieTemplate.collateral}</span>
              </div>
              <button onClick={() => setMovieTemplate(null)}><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <div className="p-4 bg-black">
              <Player
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                component={PostVideoComposition as any}
                inputProps={{
                  title:    movieTemplate.collateral,
                  hook:     form.hook || '',
                  caption:  movieTemplate.caption,
                  platform: movieTemplate.platforms.split(',')[0].trim(),
                  hashtags: form.hashtags || '',
                }}
                durationInFrames={240}
                fps={30}
                compositionWidth={1200}
                compositionHeight={628}
                style={{ width: '100%', borderRadius: 8 }}
                controls
                autoPlay
                loop
              />
            </div>
            <div className="px-6 py-3 border-t border-[#222] flex items-center justify-between">
              <p className="text-xs text-zinc-500">8 seconds · 30fps · 1200×628 — use hook + hashtags from the Create form</p>
              <button onClick={() => setMovieTemplate(null)}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LinkedIn Manual Setup Modal ──────────────────────────────────────── */}
      {showLinkedInManual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white text-sm font-bold">in</div>
                <h3 className="text-base font-semibold text-slate-900">LinkedIn Manual Setup</h3>
              </div>
              <button onClick={() => setShowLinkedInManual(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 mb-4 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">How to get your token:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>Go to <a href="https://www.linkedin.com/developers/tools/oauth/redirect" target="_blank" rel="noreferrer" className="underline font-medium">LinkedIn Token Generator ↗</a></li>
                <li>Select scope: <span className="font-mono bg-blue-100 px-1 rounded">w_member_social</span></li>
                <li>Click <strong>Request access token</strong></li>
                <li>Copy the <strong>Access Token</strong> and your <strong>Member ID</strong></li>
              </ol>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Access Token <span className="text-red-500">*</span></label>
                <textarea
                  rows={3}
                  value={liToken}
                  onChange={e => setLiToken(e.target.value)}
                  placeholder="Paste your LinkedIn access token here..."
                  className="w-full px-3 py-2 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-slate-600">Member ID</label>
                  <button
                    type="button"
                    onClick={detectMemberId}
                    disabled={liDetecting || !liToken.trim()}
                    className="text-xs text-blue-600 hover:text-blue-800 underline disabled:opacity-40">
                    {liDetecting ? 'Detecting…' : 'Auto-detect from token →'}
                  </button>
                </div>
                <input
                  value={liMemberId}
                  onChange={e => setLiMemberId(e.target.value)}
                  placeholder="Paste token above then click Auto-detect"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {liDebug && (
                  <div className="mt-1 rounded-lg bg-gray-50 border border-gray-200 p-2">
                    <p className="text-xs font-medium text-slate-600 mb-1">LinkedIn token data (find your ID here):</p>
                    <pre className="text-xs text-slate-700 overflow-auto max-h-40 whitespace-pre-wrap">{liDebug}</pre>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-600">Display name <span className="text-slate-400">(optional)</span></label>
                <input
                  value={liName}
                  onChange={e => setLiName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowLinkedInManual(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={saveLinkedInManual}
                disabled={liSaving || !liToken.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors">
                {liSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {liSaving ? 'Saving…' : 'Connect LinkedIn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
