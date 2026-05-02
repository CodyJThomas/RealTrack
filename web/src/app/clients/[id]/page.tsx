'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import type { Client } from '@/lib/types'
import { initials, avatarColor, fmtBudget, sectionLabel, inputStyle, labelStyle } from '@/lib/utils'
import { computeInsights } from '@/lib/intelligence'
import type { Signal } from '@/lib/intelligence'

type Showing = {
  id: string
  client_id: string
  address: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  shown_at: string
  notes: string | null
}

type Offer = {
  id: string
  deal_id: string
  offer_date: string
  amount: number | null
  direction: string | null
  status: string | null
  notes: string | null
}

type Deal = {
  id: string
  client_id: string
  address: string
  stage: string | null
  our_offer: number | null
  their_offer: number | null
  final_price: number | null
  notes: string | null
  offers: Offer[]
}

type ClientPrefs = {
  id: string
  price_min: number | null
  price_max: number | null
  bedrooms_min: number | null
  bathrooms_min: number | null
  target_neighborhoods: string[] | null
  must_haves: string[] | null
  dealbreakers: string[] | null
  style_notes: string | null
  timeline: string | null
}

// ── Client Intelligence ────────────────────────────────────────────────────

function daysIdle(dateStr: string): number {
  return Math.round((Date.now() - new Date(dateStr + 'T12:00:00').getTime()) / 86400000)
}

function computeSignals(
  _client: Client,
  showings: Showing[],
  reactions: Record<string, string>,
  deals: Deal[],
  prefs: ClientPrefs | null,
): Signal[] {
  const today = new Date().toISOString().split('T')[0]
  const pastShowings = showings.filter(s => s.shown_at <= today)
  const signals: Signal[] = []

  // 1. Momentum — only if 3+ past showings
  if (pastShowings.length >= 3) {
    const last3 = [...pastShowings]
      .sort((a, b) => b.shown_at.localeCompare(a.shown_at))
      .slice(0, 3)
    const reactionLabels = last3.map(s => reactions[s.id] ?? null)
    const positives = reactionLabels.filter(r => r === 'yes' || r === 'strong_yes').length
    const negatives = reactionLabels.filter(r => r === 'no' || r === 'strong_no').length
    const detailStr = last3
      .map(s => reactions[s.id]?.replace('_', ' ') ?? 'no reaction')
      .join(' → ')
    if (positives >= 2) {
      signals.push({ level: 'green', label: 'Building toward offer', detail: `Last 3: ${detailStr}` })
    } else if (negatives >= 2) {
      signals.push({ level: 'red', label: 'Needs direction change', detail: `Last 3: ${detailStr}` })
    } else {
      signals.push({ level: 'amber', label: 'Mixed signals', detail: `Last 3: ${detailStr}` })
    }
  }

  // 2. Visit ratio
  const visitCount = pastShowings.length
  const offerCount = deals.reduce((sum, d) => sum + d.offers.length, 0)
  if (visitCount >= 4) {
    if (offerCount === 0 && visitCount < 7) {
      signals.push({ level: 'amber', label: 'High visits, no offer yet', detail: `${visitCount} showings, 0 offers` })
    } else if (offerCount === 0 && visitCount >= 7) {
      signals.push({ level: 'red', label: 'High visit-to-offer ratio', detail: `${visitCount} showings, 0 offers` })
    } else if (offerCount > 0) {
      signals.push({ level: 'green', label: 'Offer activity on record', detail: `${visitCount} showings, ${offerCount} offer${offerCount !== 1 ? 's' : ''}` })
    }
  }

  // 3. Budget alignment — only if price_max and past showings with prices exist
  if (prefs?.price_max != null) {
    const pricedShowings = pastShowings.filter(s => s.price != null)
    if (pricedShowings.length > 0) {
      const max = prefs.price_max
      const overBudget = pricedShowings.filter(s => (s.price ?? 0) > max)
      const fmtMax = `$${max.toLocaleString()}`
      if (overBudget.length === 0) {
        signals.push({ level: 'green', label: 'Showing within budget', detail: `All within ${fmtMax}` })
      } else if (overBudget.length === pricedShowings.length) {
        signals.push({ level: 'red', label: 'Budget misalignment', detail: `All showings exceed ${fmtMax}` })
      } else {
        signals.push({
          level: 'amber',
          label: 'Showing above stated budget',
          detail: `${overBudget.length} of ${pricedShowings.length} showings over budget`,
        })
      }
    }
  }

  // 4. Timeline — only if prefs?.timeline and past showings exist
  if (prefs?.timeline && pastShowings.length > 0) {
    const mostRecent = [...pastShowings].sort((a, b) => b.shown_at.localeCompare(a.shown_at))[0]
    const idle = daysIdle(mostRecent.shown_at)
    if (prefs.timeline === 'asap' && idle > 14) {
      signals.push({ level: 'amber', label: 'ASAP timeline slipping', detail: `Last showing ${idle}d ago` })
    } else if (prefs.timeline === '1-3 months' && idle > 30) {
      signals.push({ level: 'amber', label: 'Falling behind timeline', detail: `Last showing ${idle}d ago` })
    }
  }

  // 5. Engagement — only if past showings exist
  if (pastShowings.length > 0) {
    const mostRecent = [...pastShowings].sort((a, b) => b.shown_at.localeCompare(a.shown_at))[0]
    const idle = daysIdle(mostRecent.shown_at)
    const idleLabel =
      idle === 0 ? 'today' :
      idle === 1 ? 'yesterday' :
      `${idle} days ago`
    if (idle <= 7) {
      signals.push({ level: 'green', label: 'Highly engaged', detail: `Last showing ${idleLabel}` })
    } else if (idle >= 31 && idle <= 90) {
      signals.push({ level: 'amber', label: 'Engagement fading', detail: `Last showing ${idle}d ago` })
    } else if (idle > 90) {
      signals.push({ level: 'red', label: 'Stalled', detail: `Last showing ${idleLabel}` })
    }
  }

  return signals
}

function ScorecardCard({ signals }: { signals: Signal[] }) {
  if (signals.length === 0) return null
  const dotColor = { green: '#16a34a', amber: '#d97706', red: '#dc2626' }
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={sectionLabel}>Client Intelligence</div>
      {signals.map((sig, i) => (
        <div key={i} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: i === 0 ? 0 : 8, paddingBottom: i === signals.length - 1 ? 0 : 8,
          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: dotColor[sig.level],
            }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>{sig.label}</span>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text2)', textAlign: 'right', marginLeft: 8 }}>
            {sig.detail}
          </span>
        </div>
      ))}
    </div>
  )
}

function InsightsCard({ signals }: { signals: Signal[] }) {
  const insights = computeInsights(signals)
  if (insights.length === 0) return null
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={sectionLabel}>Real Insights</div>
      {insights.map((ins, i) => (
        <div key={i} style={{
          paddingTop: i === 0 ? 0 : 10,
          paddingBottom: i === insights.length - 1 ? 0 : 10,
          borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={ins.level === 'red' ? 'var(--danger)' : 'var(--warn)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ flexShrink: 0, marginTop: 1 }}>
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text1)' }}>{ins.action}</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2, lineHeight: 1.4 }}>{ins.context}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────────────────────

function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return null
  const stageColors: Record<string, React.CSSProperties> = {
    active:         { background: '#DBEAFE', color: '#1D4ED8' },
    pending:        { background: '#FEF3C7', color: 'var(--warn)' },
    closed:         { background: '#DCFCE7', color: 'var(--good)' },
    cancelled:      { background: '#FEE2E2', color: 'var(--danger)' },
    'under contract': { background: '#EDE9FE', color: '#6D28D9' },
    'fallen through': { background: '#FEE2E2', color: 'var(--danger)' },
  }
  const style = stageColors[stage.toLowerCase()] ?? { background: 'var(--surface3)', color: 'var(--text2)' }
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 10, textTransform: 'uppercase', ...style,
    }}>
      {stage}
    </span>
  )
}

function ReturnToastHandler({ onToast }: { onToast: (msg: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('visit') === 'logged') onToast('Visit logged')
    if (searchParams.get('offer') === 'logged') onToast('Offer logged')
    if (searchParams.get('prefs') === 'saved') onToast('Preferences saved')
  }, [])
  return null
}

function EditIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [client,    setClient]    = useState<Client | null>(null)
  const [prefs,     setPrefs]     = useState<ClientPrefs | null>(null)
  const [showings,  setShowings]  = useState<Showing[]>([])
  const [reactions, setReactions] = useState<Record<string, string>>({})
  const [deals,     setDeals]     = useState<Deal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [updating, setUpdating] = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)

  // Edit sheet state
  const [editOpen,       setEditOpen]       = useState(false)
  const [editName,       setEditName]       = useState('')
  const [editPhone,      setEditPhone]      = useState('')
  const [editEmail,      setEditEmail]      = useState('')
  const [editBudgetMin,  setEditBudgetMin]  = useState('')
  const [editBudgetMax,  setEditBudgetMax]  = useState('')
  const [editRetainer,   setEditRetainer]   = useState(false)
  const [editNotes,      setEditNotes]      = useState('')
  const [editShowPrefs,  setEditShowPrefs]  = useState(false)
  const [editNeighborhoods, setEditNeighborhoods] = useState('')
  const [editMustHaves,     setEditMustHaves]     = useState('')
  const [editDealbreakers,  setEditDealbreakers]  = useState('')
  const [editStyleNotes,    setEditStyleNotes]    = useState('')
  const [editBedroomsMin,   setEditBedroomsMin]   = useState('')
  const [editBathroomsMin,  setEditBathroomsMin]  = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [
      { data: clientData },
      { data: showingData },
      { data: dealData },
      { data: prefsData },
      { data: reactionData },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('showings').select('*').eq('client_id', id).order('shown_at', { ascending: false }),
      supabase.from('deals').select('*').eq('client_id', id),
      supabase.from('client_preferences').select('*').eq('client_id', id).maybeSingle(),
      supabase.from('showing_reactions').select('showing_id, overall_reaction').eq('client_id', id),
    ])

    if (!clientData) { router.push('/clients'); return }
    setClient(clientData as Client)
    setPrefs((prefsData as ClientPrefs | null) ?? null)

    const rawShowings = (showingData ?? []) as Showing[]
    setShowings(rawShowings)

    const reactionMap: Record<string, string> = {}
    for (const r of (reactionData ?? []) as { showing_id: string; overall_reaction: string }[]) {
      reactionMap[r.showing_id] = r.overall_reaction
    }
    setReactions(reactionMap)

    const rawDeals = (dealData ?? []) as Omit<Deal, 'offers'>[]
    if (rawDeals.length > 0) {
      const dealIds = rawDeals.map(d => d.id)
      const { data: offerData } = await supabase
        .from('offers').select('*').in('deal_id', dealIds)
        .order('offer_date', { ascending: false })

      const offersByDeal: Record<string, Offer[]> = {}
      for (const o of (offerData ?? []) as Offer[]) {
        if (!offersByDeal[o.deal_id]) offersByDeal[o.deal_id] = []
        offersByDeal[o.deal_id].push(o)
      }
      setDeals(rawDeals.map(d => ({ ...d, offers: offersByDeal[d.id] ?? [] })))
    } else {
      setDeals([])
    }

    setLoading(false)
  }

  function openEdit() {
    if (!client) return
    setEditName(client.full_name)
    setEditPhone(client.phone ?? '')
    setEditEmail(client.email ?? '')
    setEditBudgetMin(client.budget_min ? String(client.budget_min) : '')
    setEditBudgetMax(client.budget_max ? String(client.budget_max) : '')
    setEditRetainer(client.retainer_required)
    setEditNotes(client.notes ?? '')
    setEditNeighborhoods(prefs?.target_neighborhoods?.join(', ') ?? '')
    setEditMustHaves(prefs?.must_haves?.join(', ') ?? '')
    setEditDealbreakers(prefs?.dealbreakers?.join(', ') ?? '')
    setEditStyleNotes(prefs?.style_notes ?? '')
    setEditBedroomsMin(prefs?.bedrooms_min ? String(prefs.bedrooms_min) : '')
    setEditBathroomsMin(prefs?.bathrooms_min ? String(prefs.bathrooms_min) : '')
    setEditShowPrefs(!!(prefs))
    setEditOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)

    await supabase.from('clients').update({
      full_name:         editName.trim(),
      phone:             editPhone.trim() || null,
      email:             editEmail.trim() || null,
      budget_min:        editBudgetMin ? Number(editBudgetMin) : null,
      budget_max:        editBudgetMax ? Number(editBudgetMax) : null,
      retainer_required: editRetainer,
      notes:             editNotes.trim() || null,
    }).eq('id', id)

    const hasPrefs = editNeighborhoods.trim() || editMustHaves.trim() ||
      editDealbreakers.trim() || editStyleNotes.trim() ||
      editBedroomsMin.trim() || editBathroomsMin.trim()

    if (hasPrefs) {
      const prefsPayload = {
        client_id:             id,
        target_neighborhoods:  editNeighborhoods.trim()
          ? editNeighborhoods.split(',').map(s => s.trim()).filter(Boolean) : null,
        must_haves:            editMustHaves.trim()
          ? editMustHaves.split(',').map(s => s.trim()).filter(Boolean) : null,
        dealbreakers:          editDealbreakers.trim()
          ? editDealbreakers.split(',').map(s => s.trim()).filter(Boolean) : null,
        style_notes:           editStyleNotes.trim() || null,
        bedrooms_min:          editBedroomsMin ? Number(editBedroomsMin) : null,
        bathrooms_min:         editBathroomsMin ? Number(editBathroomsMin) : null,
      }
      if (prefs) {
        await supabase.from('client_preferences').update(prefsPayload).eq('client_id', id)
      } else {
        await supabase.from('client_preferences').insert(prefsPayload)
      }
    }

    setSaving(false)
    setEditOpen(false)
    setToast('Client updated')
    await load()
  }

  async function markRetainerRequired() {
    if (!client) return
    setUpdating(true)
    await supabase.from('clients').update({ retainer_required: true }).eq('id', id)
    setUpdating(false)
    await load()
    setToast('Retainer flag set')
  }

  async function archiveClient() {
    if (!client) return
    setUpdating(true)
    await supabase.from('clients').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setUpdating(false)
    router.push('/clients')
  }

  if (loading) return (
    <div style={{ paddingBottom: 80 }}>
      <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      <BottomNav />
    </div>
  )

  if (!client) return null

  const visitCount  = showings.length
  const offerCount  = deals.reduce((sum, d) => sum + d.offers.length, 0)
  const progressPct = Math.min(visitCount / 10 * 100, 100)
  const progressColor = visitCount > 6 ? 'var(--danger)' : visitCount > 3 ? 'var(--warn)' : 'var(--brand)'
  const recentShowings = showings.slice(0, 5)
  const budget = fmtBudget(client.budget_min, client.budget_max)

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  function fmtAmount(amount: number | null) {
    if (!amount) return '—'
    return `$${amount.toLocaleString()}`
  }
  function fmtArray(arr: string[] | null) {
    if (!arr || arr.length === 0) return null
    return arr.join(', ')
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.push('/clients')} style={{
          background: 'none', border: 'none', fontSize: 22,
          cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: avatarColor(client.full_name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 500, flexShrink: 0,
        }}>
          {initials(client.full_name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{client.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {visitCount} visits · {offerCount} offers
          </div>
        </div>
        <button onClick={openEdit} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', padding: 4,
        }}>
          <EditIcon />
        </button>
      </div>

      {/* Contact actions */}
      {(client.phone || client.email) && (
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border)',
          display: 'flex', gap: 8,
        }}>
          {client.phone && (
            <a href={`tel:${client.phone}`} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: 'var(--brand-light)', color: 'var(--brand)',
              textDecoration: 'none', border: '1.5px solid var(--brand)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.5 2 2 0 0 1 3.58 1.34h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9a16 16 0 0 0 6 6l1.02-.93a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 21.72 16.92z"/>
              </svg>
              Call
            </a>
          )}
          {client.phone && (
            <a href={`sms:${client.phone}`} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: 'var(--surface3)', color: 'var(--text1)',
              textDecoration: 'none', border: '1.5px solid var(--border)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              Text
            </a>
          )}
          {client.email && (
            <a href={`mailto:${client.email}`} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
              background: 'var(--surface3)', color: 'var(--text1)',
              textDecoration: 'none', border: '1.5px solid var(--border)',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Email
            </a>
          )}
        </div>
      )}

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Client Intelligence + Real Insights */}
        {!loading && (() => {
          const signals = computeSignals(client, showings, reactions, deals, prefs)
          return (
            <>
              {signals.length > 0 && <ScorecardCard signals={signals} />}
              <InsightsCard signals={signals} />
            </>
          )
        })()}

        {/* Visit activity */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Visit activity</div>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)', marginBottom: 12 }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${progressPct}%`, background: progressColor,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: recentShowings.length > 0 ? 12 : 0 }}>
            {visitCount} of 10 visits tracked
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            Amber at 4+ visits · Red at 7+
          </div>
          {recentShowings.length > 0 && (
            <div>
              {recentShowings.map((s, i) => {
                const reaction = reactions[s.id] ?? null
                const isUpcoming = new Date(s.shown_at) > new Date()
                const dotColor =
                  reaction === 'strong_yes' ? '#16a34a' :
                  reaction === 'yes'        ? '#65a30d' :
                  reaction === 'maybe'      ? '#ca8a04' :
                  reaction === 'no'         ? '#ea580c' :
                  reaction === 'strong_no'  ? '#dc2626' : null
                return (
                  <div key={s.id}
                    onClick={() => router.push(`/clients/${id}/showings/${s.id}/react`)}
                    style={{
                      paddingTop: 8, paddingBottom: 8,
                      borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: dotColor ?? 'var(--border)',
                        border: dotColor ? 'none' : '1.5px solid var(--text3)',
                      }} />
                      <span style={{ fontSize: 13, color: 'var(--text1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.address}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                      {isUpcoming && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--brand)', background: 'var(--brand-light)', padding: '2px 6px', borderRadius: 10 }}>
                          Upcoming
                        </span>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(s.shown_at)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {recentShowings.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No showings recorded yet.</p>
          )}
        </div>

        {/* Deals & offers */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Deals & offers</div>
          {deals.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No deals yet.</p>
          ) : (
            deals.map((deal, di) => (
              <div key={deal.id} style={{
                marginBottom: di < deals.length - 1 ? 16 : 0,
                paddingBottom: di < deals.length - 1 ? 16 : 0,
                borderBottom: di < deals.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{deal.address}</span>
                  <StageBadge stage={deal.stage} />
                </div>
                {deal.offers.length === 0 ? (
                  <p style={{ fontSize: 12, color: 'var(--text3)' }}>No offers on this deal.</p>
                ) : (
                  deal.offers.map(o => (
                    <div key={o.id} style={{
                      display: 'flex', justifyContent: 'space-between',
                      paddingTop: 6, paddingBottom: 6,
                      borderTop: '1px solid var(--border)', fontSize: 13,
                    }}>
                      <div>
                        <span style={{ color: 'var(--text2)', marginRight: 6 }}>{fmtDate(o.offer_date)}</span>
                        {o.direction && <span style={{ color: 'var(--text3)', marginRight: 6 }}>{o.direction}</span>}
                        {fmtAmount(o.amount)}
                      </div>
                      {o.status && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{o.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </div>

        {/* Preferences */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={sectionLabel as React.CSSProperties}>Preferences</span>
            <button onClick={() => router.push(`/clients/${id}/preferences`)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--brand)', fontWeight: 600, padding: 0,
            }}>
              {prefs ? 'Edit' : 'Set up →'}
            </button>
          </div>
          {!prefs ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No preferences captured yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(prefs.bedrooms_min || prefs.bathrooms_min) && (
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  {prefs.bedrooms_min && (
                    <span><span style={{ color: 'var(--text3)' }}>Beds </span>{prefs.bedrooms_min}+</span>
                  )}
                  {prefs.bathrooms_min && (
                    <span><span style={{ color: 'var(--text3)' }}>Baths </span>{prefs.bathrooms_min}+</span>
                  )}
                </div>
              )}
              {prefs.target_neighborhoods && prefs.target_neighborhoods.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Neighborhoods</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {prefs.target_neighborhoods.map(n => (
                      <span key={n} style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 12,
                        background: 'var(--surface3)', color: 'var(--text2)',
                      }}>{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {prefs.must_haves && prefs.must_haves.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Must-haves</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {prefs.must_haves.map(m => (
                      <span key={m} style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 12,
                        background: 'var(--brand-light)', color: 'var(--brand)',
                      }}>{m}</span>
                    ))}
                  </div>
                </div>
              )}
              {prefs.dealbreakers && prefs.dealbreakers.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 4 }}>Dealbreakers</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {prefs.dealbreakers.map(d => (
                      <span key={d} style={{
                        padding: '3px 9px', borderRadius: 20, fontSize: 12,
                        background: '#FEE2E2', color: 'var(--danger)',
                      }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
              {prefs.style_notes && (
                <p style={{ fontSize: 13, color: 'var(--text2)', margin: 0 }}>{prefs.style_notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Notes */}
        {client.notes && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={sectionLabel}>Notes</div>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>{client.notes}</p>
          </div>
        )}

        {/* Contact */}
        {(client.phone || client.email || budget) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={sectionLabel}>Contact</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {client.phone && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Phone</span>
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Email</span>
                  <span>{client.email}</span>
                </div>
              )}
              {budget && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Budget</span>
                  <span>{budget}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action row */}
        <div style={{ display: 'flex', gap: 10 }}>
          <a href={`/clients/${id}/log-visit`} style={{
            flex: 1, padding: '12px 16px', borderRadius: 8,
            background: 'var(--brand)', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', textAlign: 'center',
          }}>
            Log showing
          </a>
          <a href={`/clients/${id}/log-offer`} style={{
            flex: 1, padding: '12px 16px', borderRadius: 8,
            background: 'var(--surface3)', color: 'var(--text1)',
            border: '1px solid var(--border)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', textAlign: 'center',
          }}>
            Log offer
          </a>
        </div>
        <a href={`/clients/${id}/score`} style={{
          display: 'block', padding: '12px 16px', borderRadius: 8,
          background: 'var(--surface3)', color: 'var(--text1)',
          border: '1px solid var(--border)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          textDecoration: 'none', textAlign: 'center',
        }}>
          Score a Property
        </a>

        {/* Danger zone */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Danger zone</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!client.retainer_required && (
              <button onClick={markRetainerRequired} disabled={updating} style={{
                padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                background: 'var(--surface3)', border: '1px solid var(--border)',
                color: 'var(--text1)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                opacity: updating ? 0.6 : 1,
              }}>
                Mark retainer required
              </button>
            )}
            {archiveConfirm ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={archiveClient} disabled={updating} style={{
                  flex: 1, padding: '12px 16px', borderRadius: 8,
                  background: 'var(--danger)', border: 'none',
                  color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  opacity: updating ? 0.6 : 1,
                }}>
                  {updating ? 'Archiving…' : 'Confirm archive'}
                </button>
                <button onClick={() => setArchiveConfirm(false)} style={{
                  padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
                }}>
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setArchiveConfirm(true)} disabled={updating} style={{
                padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                background: 'var(--surface3)', border: '1px solid var(--border)',
                color: 'var(--danger)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                opacity: updating ? 0.6 : 1, width: '100%',
              }}>
                Archive client
              </button>
            )}
          </div>
        </div>

      </div>

      <BottomNav />

      <Suspense fallback={null}>
        <ReturnToastHandler onToast={msg => setToast(msg)} />
      </Suspense>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {/* Edit sheet */}
      {editOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px 16px 0 0',
            width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '0 0 32px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface3)' }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Edit Client</h2>
              <button onClick={() => setEditOpen(false)} style={{
                background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)',
              }}>×</button>
            </div>

            <form onSubmit={handleSave} style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full name *</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="(555) 000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  placeholder="jane@example.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Budget range ($)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="text" inputMode="numeric" value={editBudgetMin}
                    onChange={e => setEditBudgetMin(e.target.value)}
                    placeholder="Min" style={{ ...inputStyle, flex: 1 }} />
                  <input type="text" inputMode="numeric" value={editBudgetMax}
                    onChange={e => setEditBudgetMax(e.target.value)}
                    placeholder="Max" style={{ ...inputStyle, flex: 1 }} />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={editRetainer} onChange={e => setEditRetainer(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--brand)' }} />
                <span style={{ fontSize: 14, color: 'var(--text1)' }}>Retainer required</span>
              </label>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* Preferences section */}
              <div style={{ paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => setEditShowPrefs(p => !p)} style={{
                  background: 'none', border: 'none', padding: '10px 0',
                  fontSize: 13, fontWeight: 600, color: 'var(--brand)',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                }}>
                  {editShowPrefs ? '− Hide preferences' : '＋ Edit preferences'}
                </button>
                {editShowPrefs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Min beds</label>
                        <input type="text" inputMode="numeric" value={editBedroomsMin}
                          onChange={e => setEditBedroomsMin(e.target.value)}
                          placeholder="2" style={inputStyle} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Min baths</label>
                        <input type="text" inputMode="decimal" value={editBathroomsMin}
                          onChange={e => setEditBathroomsMin(e.target.value)}
                          placeholder="1.5" style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Target neighborhoods (comma-separated)</label>
                      <input type="text" value={editNeighborhoods}
                        onChange={e => setEditNeighborhoods(e.target.value)}
                        placeholder="Downtown, Westside, Oakwood" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Must-haves (comma-separated)</label>
                      <input type="text" value={editMustHaves}
                        onChange={e => setEditMustHaves(e.target.value)}
                        placeholder="Garage, Backyard, Open kitchen" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Dealbreakers (comma-separated)</label>
                      <input type="text" value={editDealbreakers}
                        onChange={e => setEditDealbreakers(e.target.value)}
                        placeholder="HOA, No yard, Busy street" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Style notes</label>
                      <textarea value={editStyleNotes} onChange={e => setEditStyleNotes(e.target.value)}
                        rows={2} style={{ ...inputStyle, resize: 'vertical' }}
                        placeholder="Prefers modern, open floor plans..." />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" disabled={saving || !editName.trim()} style={{
                marginTop: 4, padding: '14px 16px', borderRadius: 10,
                background: 'var(--brand)', color: '#fff', border: 'none',
                fontSize: 15, fontWeight: 700,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving || !editName.trim() ? 0.6 : 1,
              }}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
