'use client'
import { useEffect, useState } from 'react'
import Header from '@/components/layout/Header'
import { supabase } from '@/lib/supabase'
import { Plus, X, Loader2, Calendar, LayoutGrid, PenSquare, Globe, ChevronLeft, ChevronRight, Pencil, Check, Sparkles, RefreshCw, BookOpen, Bell, Link2, Copy, CheckCheck, ListChecks, ImageIcon, ExternalLink, Upload, Eye } from 'lucide-react'
import { PostTrackerTable } from '@/app/(crm)/post-tracker/page'

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

const emptyForm = {
  collateral: '',
  platforms: [] as string[],
  background: '',
  media_type: '',
  cta: '',
  caption: '',
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

  // Manual LinkedIn setup
  // ── DB templates state ──────────────────────────────────────────────────
  const [dbTemplates, setDbTemplates] = useState<PostTemplate[]>([])
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<PostTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState({
    title: '', platforms: '', media_type: '', background: '', cta: '', caption: '', sort_order: 0,
    design_url: '', design_preview_url: '',
  })
  const [designUploading, setDesignUploading] = useState(false)
  // Post preview modal
  const [showPostPreview, setShowPostPreview] = useState(false)
  const [selectedDesign, setSelectedDesign] = useState<{ url?: string | null; design_url?: string | null } | null>(null)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [showTemplateForm, setShowTemplateForm] = useState(false)

  // Use DB templates if loaded, fall back to hardcoded list
  type ActiveTemplate = typeof FALLBACK_TEMPLATES[0] & {
    design_url?: string | null
    design_preview_url?: string | null
  }
  const activeTemplates: ActiveTemplate[] = dbTemplates.length > 0
    ? dbTemplates.filter(t => t.active).map(t => ({
        collateral: t.title, platforms: t.platforms, media_type: t.media_type,
        background: t.background, cta: t.cta, caption: t.caption,
        design_url: t.design_url, design_preview_url: t.design_preview_url,
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
    const { data } = await supabase
      .from('post_templates')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
    if (data && data.length > 0) setDbTemplates(data)
  }

  useEffect(() => {
    fetchPosts()
    fetchConnections()
    fetchCampaigns()
    fetchTemplates()
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
    setForm(f => {
      // If a campaign is already selected, append its UTM to the template caption
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
        platforms: t.platforms.split(', ').map(p => p.trim()),
        background: t.background,
        media_type: t.media_type,
        cta: t.cta,
        caption,
      }
    })
    setSelectedTemplate(t.collateral)
    setSelectedDesign({ url: (t as ActiveTemplate).design_preview_url, design_url: (t as ActiveTemplate).design_url })
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    const payload = {
      collateral: form.collateral,
      platforms: form.platforms.join(', '),
      background: form.background,
      media_type: form.media_type,
      cta: form.cta,
      caption: form.caption,
      scheduled_date: form.scheduled_date || null,
      status: form.status,
      campaign_id: form.campaign_id || null,
    }
    const { error } = editingPost
      ? await supabase.from('social_posts').update(payload).eq('id', editingPost.id)
      : await supabase.from('social_posts').insert([payload])
    setSaving(false)
    if (error) { setError(error.message); return }

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
    setTemplateForm({ title: '', platforms: '', media_type: '', background: '', cta: '', caption: '', sort_order: dbTemplates.length + 1, design_url: '', design_preview_url: '' })
    setShowTemplateForm(true)
  }

  function openEditTemplate(t: PostTemplate) {
    setEditingTemplate(t)
    setTemplateForm({ title: t.title, platforms: t.platforms, media_type: t.media_type, background: t.background, cta: t.cta, caption: t.caption, sort_order: t.sort_order, design_url: t.design_url ?? '', design_preview_url: t.design_preview_url ?? '' })
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

  async function saveTemplate(e: React.FormEvent) {
    e.preventDefault()
    if (!templateForm.title.trim()) return
    setTemplateSaving(true)
    const payload = { ...templateForm, updated_at: new Date().toISOString() }
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
      platforms: post.platforms.split(', ').map(p => p.trim()),
      background: post.background,
      media_type: post.media_type,
      cta: post.cta,
      caption: post.caption,
      scheduled_date: post.scheduled_date ?? '',
      status: post.status,
      campaign_id: post.campaign_id ?? '',
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
        title="Social Campaign Manager"
        subtitle={`${totalPosts} posts · ${scheduledCount} scheduled · ${publishedCount} published`}
      />

      {/* Admin badge + connection indicators */}
      <div className="px-6 pt-4 flex items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-orange-100 text-orange-700 px-3 py-1 rounded-full">
          🔐 Admin Only
        </span>
        {/* Platform connection dots */}
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
            { label: 'Total Posts', value: totalPosts, color: 'text-sky-600', bg: 'bg-sky-50' },
            { label: 'Drafts', value: draftCount, color: 'text-slate-600', bg: 'bg-gray-50' },
            { label: 'Scheduled', value: scheduledCount, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Published', value: publishedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
                    {activeTemplates.map(t => (
                      <button key={t.collateral}
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
                      onClick={() => { if (!hasPost) setDayPickerDate(dateStr) }}
                      className={`border-r border-b ${cellBg} min-h-28 p-2 transition-colors group ${!hasPost ? 'cursor-pointer hover:bg-orange-50/30' : ''}`}>

                      {/* Day number */}
                      <div className="flex items-start justify-between mb-1.5">
                        <div className={`text-xs font-bold h-5 w-5 flex items-center justify-center rounded-full ${
                          isToday ? 'bg-orange-500 text-white' : hasPost ? 'text-slate-700' : 'text-slate-400'
                        }`}>{day}</div>
                        {!hasPost && <Plus className="h-3 w-3 text-slate-200 group-hover:text-orange-400 transition-colors" />}
                        {hasPost && dayPosts.length > 1 && (
                          <span className="text-xs font-semibold text-slate-500 bg-white/70 rounded px-1">{dayPosts.length}</span>
                        )}
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
                          <button type="button" onClick={() => deleteTemplate(t.id)} className="text-slate-400 hover:text-red-500">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {dbTemplates.filter(t => t.active).length === 0 && (
                        <p className="text-xs text-slate-400 text-center py-2">No templates yet — click New above</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {activeTemplates.map(t => {
                    const tDesign = t as ActiveTemplate
                    return (
                      <div key={t.collateral}
                        onClick={() => applyTemplate(t)}
                        className={`rounded-lg border cursor-pointer transition-all overflow-hidden ${
                          selectedTemplate === t.collateral
                            ? 'border-orange-500/40 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}>
                        {/* Design thumbnail */}
                        {tDesign.design_preview_url ? (
                          <div className="relative w-full h-24 bg-gray-100 overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={tDesign.design_preview_url} alt={t.collateral} className="w-full h-full object-cover" />
                            {tDesign.design_url && (
                              <a href={tDesign.design_url} target="_blank" rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="absolute top-1.5 right-1.5 bg-white/90 hover:bg-white rounded px-1.5 py-0.5 text-xs font-medium text-blue-600 flex items-center gap-1 shadow-sm">
                                <ExternalLink className="h-3 w-3" /> Design
                              </a>
                            )}
                          </div>
                        ) : tDesign.design_url ? (
                          <div className="w-full h-10 bg-blue-50 flex items-center justify-center border-b border-blue-100">
                            <a href={tDesign.design_url} target="_blank" rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="text-xs font-medium text-blue-600 flex items-center gap-1 hover:underline">
                              <ExternalLink className="h-3 w-3" /> Open design in Canva
                            </a>
                          </div>
                        ) : null}
                        <div className="p-3">
                          <p className="text-xs font-semibold text-slate-800">{t.collateral}</p>
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
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {editingPost ? '✏️ Edit Post' : '✨ Create New Post'}
                  </h3>
                  {editingPost && (
                    <button onClick={() => { setEditingPost(null); setForm(emptyForm); setSelectedTemplate(null) }}
                      className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                      <X className="h-3.5 w-3.5" /> Cancel edit
                    </button>
                  )}
                </div>
                <form onSubmit={savePost} data-post-form className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Post Title / Collateral <span className="text-red-500">*</span></label>
                      <input required value={form.collateral} onChange={e => setForm(f => ({ ...f, collateral: e.target.value }))}
                        placeholder="e.g. Teaser Post #1" className={inputCls} />
                    </div>

                    {/* Campaign selector */}
                    <div className="col-span-2 flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Campaign <span className="text-slate-400">(optional)</span></label>
                      <select
                        value={form.campaign_id}
                        onChange={e => {
                          const newCampaignId = e.target.value
                          const LANDING = 'https://agentspilot-marketing.vercel.app/signup'

                          // Build new UTM link for the newly selected campaign
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

                          // Strip any previously appended UTM link from caption
                          const stripUtm = (caption: string) =>
                            caption.replace(/\n+https?:\/\/[^\s]+utm_[^\s]*/g, '').trimEnd()

                          setForm(f => {
                            const cleanCaption = stripUtm(f.caption)
                            const newCaption = newCampaignId
                              ? `${cleanCaption}\n${buildUtm(newCampaignId)}`
                              : cleanCaption
                            return { ...f, campaign_id: newCampaignId, caption: newCaption }
                          })
                        }}
                        className={inputCls}>
                        <option value="">— No campaign —</option>
                        {campaigns.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.status !== 'active' ? `(${c.status})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Platform checkboxes */}
                    <div className="col-span-2 flex flex-col gap-1">
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
                              onChange={e => setForm(f => ({
                                ...f,
                                platforms: e.target.checked
                                  ? [...f.platforms, pl]
                                  : f.platforms.filter(p => p !== pl)
                              }))} />
                            {pl}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">Media Type</label>
                      <input value={form.media_type} onChange={e => setForm(f => ({ ...f, media_type: e.target.value }))}
                        placeholder="e.g. Short Video, Static Image" className={inputCls} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">CTA</label>
                      <input value={form.cta} onChange={e => setForm(f => ({ ...f, cta: e.target.value }))}
                        placeholder="e.g. 👉 Follow to see more" className={inputCls} />
                    </div>
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

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Background / Messaging</label>
                    <textarea rows={3} value={form.background} onChange={e => setForm(f => ({ ...f, background: e.target.value }))}
                      placeholder="The key message and context for this post..."
                      className={`${inputCls} resize-none`} />
                  </div>

                  {/* ── AI Toggle ─────────────────────────────────────────── */}
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-400" />
                      <span className="text-sm font-medium text-slate-700">Generate caption with AI</span>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">Claude</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUseAI(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useAI ? 'bg-orange-500' : 'bg-gray-200'}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${useAI ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* ── AI Generator ──────────────────────────────────────── */}
                  {useAI && <div className="rounded-xl border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-orange-500" />
                      <h4 className="text-sm font-semibold text-slate-800">Generate Caption with AI</h4>
                      <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Claude</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-medium text-slate-500">What should this post be about?</label>
                      <textarea
                        rows={2}
                        value={aiBrief}
                        onChange={e => setAiBrief(e.target.value)}
                        placeholder="e.g. Announcing our new AI lead scoring feature that cuts pipeline review time in half"
                        className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700 resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Platform</label>
                        <select
                          value={aiPlatform}
                          onChange={e => setAiPlatform(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
                          {['LinkedIn', 'Facebook', 'Instagram', 'TikTok', 'Website'].map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-slate-500">Tone</label>
                        <select
                          value={aiTone}
                          onChange={e => setAiTone(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-orange-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-700">
                          {['Professional', 'Casual', 'Bold', 'Inspirational'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    {aiError && (
                      <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{aiError}</p>
                    )}
                    <button
                      type="button"
                      onClick={generateWithAI}
                      disabled={aiLoading || !aiBrief.trim()}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors w-full justify-center">
                      {aiLoading
                        ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Generating…</>
                        : <><Sparkles className="h-3.5 w-3.5" /> Generate Caption &amp; CTA</>
                      }
                    </button>
                    {form.caption && !aiLoading && (
                      <p className="text-xs text-emerald-600 flex items-center gap-1">
                        <Check className="h-3 w-3" /> Caption applied below — edit as needed
                      </p>
                    )}
                  </div>}

                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-slate-500">Post Caption <span className="text-red-500">*</span></label>
                    <textarea required rows={5} value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
                      placeholder="Write the final caption text here, or generate with AI above..."
                      className={`${inputCls} resize-none font-mono text-xs`} />
                    <p className="text-xs text-slate-400">{form.caption.length} chars</p>
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
            <PostTrackerTable showHeader={false} />
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
              {activeTemplates.map(t => (
                <button
                  key={t.collateral}
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
              <div className={`grid gap-5 ${selectedDesign?.url ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Design side */}
                {selectedDesign?.url && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Design</p>
                    <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={selectedDesign.url} alt="Post design" className="w-full object-cover" />
                    </div>
                    {selectedDesign.design_url && (
                      <a href={selectedDesign.design_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium">
                        <ExternalLink className="h-3 w-3" /> Open in Canva / Figma
                      </a>
                    )}
                  </div>
                )}
                {/* Caption side */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Caption</p>
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
                  <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{form.caption || '(no caption yet)'}</p>
                  </div>
                  {form.scheduled_date && (
                    <p className="text-xs text-slate-500">📅 Scheduled: {form.scheduled_date}</p>
                  )}
                </div>
              </div>
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
              <button onClick={() => setShowTemplateForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
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

                {/* Preview */}
                {templateForm.design_preview_url && (
                  <div className="relative rounded-lg overflow-hidden border border-gray-200 h-32">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={templateForm.design_preview_url} alt="Design preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setTemplateForm(f => ({ ...f, design_preview_url: '' }))}
                      className="absolute top-1.5 right-1.5 bg-white rounded-full p-0.5 shadow hover:bg-red-50">
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </button>
                  </div>
                )}

                {/* Upload or URL */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Design Image <span className="text-slate-400">(upload or paste URL)</span></label>
                  <div className="flex gap-2">
                    <label className={`flex items-center gap-2 px-3 py-2 text-xs border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 ${designUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                      {designUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" /> : <Upload className="h-3.5 w-3.5 text-slate-400" />}
                      <span className="text-slate-500">{designUploading ? 'Uploading…' : 'Upload image'}</span>
                      <input type="file" accept="image/*" className="hidden"
                        onChange={async e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const url = await uploadDesignImage(file)
                          if (url) setTemplateForm(f => ({ ...f, design_preview_url: url }))
                        }} />
                    </label>
                    <span className="text-xs text-slate-400 self-center">or</span>
                    <input value={templateForm.design_preview_url}
                      onChange={e => setTemplateForm(f => ({ ...f, design_preview_url: e.target.value }))}
                      placeholder="https://… image URL"
                      className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>

                {/* Canva / Figma link */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-slate-500">Canva / Figma link <span className="text-slate-400">(optional)</span></label>
                  <input value={templateForm.design_url}
                    onChange={e => setTemplateForm(f => ({ ...f, design_url: e.target.value }))}
                    placeholder="https://www.canva.com/design/…"
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" />
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
