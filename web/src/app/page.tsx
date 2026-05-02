'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { initials, avatarColor } from '@/lib/utils'

type ClientRow = {
  id: string
  full_name: string
  flag_reason: string | null
  retainer_required: boolean
}

type Tier = 'hot' | 'warm' | 'stalled' | 'new'

type ClientStats = ClientRow & {
  visitCount: number
  offerCount: number
  lastShown: string | null
  daysIdle: number | null
  timeline: string | null
  tier: Tier
}

type UpcomingShowing = {
  showingId: string
  clientId: string
  clientName: string
  address: string
  shown_at: string
}

const TIER_CONFIG: Record<Tier, { label: string; desc: string; color: string }> = {
  hot:     { label: 'Hot',     desc: 'Active last 14 days', color: '#dc2626' },
  warm:    { label: 'Warm',    desc: 'Active last 90 days', color: '#d97706' },
  stalled: { label: 'Stalled', desc: 'Needs attention',     color: '#9ca3af' },
  new:     { label: 'New',     desc: 'No showings yet',     color: 'var(--brand)' },
}

function TierIcon({ tier }: { tier: Tier }) {
  if (tier === 'hot') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2c0 6-6 8-6 14a6 6 0 0 0 12 0c0-6-6-8-6-14z" />
      <path d="M12 12c0 3-2 4-2 7a2 2 0 0 0 4 0c0-3-2-4-2-7z" fill="#dc2626" stroke="none" />
    </svg>
  )
  if (tier === 'warm') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
  if (tier === 'stalled') return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="16" />
      <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

const TIMELINE_LABELS: Record<string, string> = {
  'asap':       'ASAP',
  '1-3 months': '1–3mo',
  '3-6 months': '3–6mo',
  '6-12 months':'6–12mo',
  'flexible':   'Flexible',
}

function daysAgo(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return Math.round((Date.now() - d.getTime()) / 86400000)
}

function daysFrom(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  return Math.round((d.getTime() - Date.now()) / 86400000)
}

function fmtIdle(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function fmtUpcoming(dateStr: string): string {
  const d = daysFrom(dateStr)
  if (d <= 0) return 'Today'
  if (d === 1) return 'Tomorrow'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function timelineBadge(t: string) {
  const urgent = t === 'asap' || t === '1-3 months'
  return {
    bg:    urgent ? (t === 'asap' ? '#fee2e2' : '#ffedd5') : 'var(--surface3)',
    color: urgent ? (t === 'asap' ? '#dc2626' : '#ea580c') : 'var(--text3)',
  }
}

export default function CapacityDashboard() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientStats[]>([])
  const [upcoming, setUpcoming] = useState<UpcomingShowing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: clientData } = await supabase
        .from('clients')
        .select('id, full_name, flag_reason, retainer_required')
        .is('archived_at', null)

      if (!clientData || clientData.length === 0) { setLoading(false); return }

      const clientIds = (clientData as ClientRow[]).map(c => c.id)
      const todayStr  = new Date().toISOString().split('T')[0]
      const in7Days   = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]

      const [
        { data: showingData },
        { data: dealData },
        { data: prefsData },
      ] = await Promise.all([
        supabase.from('showings').select('id, client_id, shown_at, address').in('client_id', clientIds),
        supabase.from('deals').select('id, client_id').in('client_id', clientIds),
        supabase.from('client_preferences').select('client_id, timeline').in('client_id', clientIds),
      ])

      const dealIds = (dealData ?? []).map((d: { id: string }) => d.id)
      const { data: offerData } = dealIds.length > 0
        ? await supabase.from('offers').select('deal_id').in('deal_id', dealIds)
        : { data: [] }

      // --- showings ---
      const visitMap:    Record<string, number> = {}
      const lastShownMap: Record<string, string> = {}
      const upcomingList: UpcomingShowing[] = []

      for (const s of (showingData ?? []) as { id: string; client_id: string; shown_at: string; address: string }[]) {
        if (s.shown_at > todayStr && s.shown_at <= in7Days) {
          const c = (clientData as ClientRow[]).find(x => x.id === s.client_id)
          if (c) upcomingList.push({ showingId: s.id, clientId: s.client_id, clientName: c.full_name, address: s.address, shown_at: s.shown_at })
        }
        if (s.shown_at <= todayStr) {
          visitMap[s.client_id] = (visitMap[s.client_id] ?? 0) + 1
          if (!lastShownMap[s.client_id] || s.shown_at > lastShownMap[s.client_id])
            lastShownMap[s.client_id] = s.shown_at
        }
      }
      upcomingList.sort((a, b) => a.shown_at.localeCompare(b.shown_at))
      setUpcoming(upcomingList)

      // --- offers ---
      const dealClientMap: Record<string, string> = {}
      for (const d of (dealData ?? []) as { id: string; client_id: string }[])
        dealClientMap[d.id] = d.client_id

      const offerMap: Record<string, number> = {}
      for (const o of (offerData ?? []) as { deal_id: string }[]) {
        const cid = dealClientMap[o.deal_id]
        if (cid) offerMap[cid] = (offerMap[cid] ?? 0) + 1
      }

      // --- timeline ---
      const timelineMap: Record<string, string> = {}
      for (const p of (prefsData ?? []) as { client_id: string; timeline: string | null }[])
        if (p.timeline) timelineMap[p.client_id] = p.timeline

      // --- triage ---
      const enriched: ClientStats[] = (clientData as ClientRow[]).map(c => {
        const visitCount = visitMap[c.id] ?? 0
        const offerCount = offerMap[c.id] ?? 0
        const lastShown  = lastShownMap[c.id] ?? null
        const idle       = lastShown ? daysAgo(lastShown) : null

        let tier: Tier
        if (visitCount === 0) tier = 'new'
        else if (idle !== null && idle <= 14) tier = 'hot'
        else if (idle !== null && idle <= 90) tier = 'warm'
        else tier = 'stalled'

        return { ...c, visitCount, offerCount, lastShown, daysIdle: idle, timeline: timelineMap[c.id] ?? null, tier }
      })

      setClients(enriched)
      setLoading(false)
    }
    load()
  }, [])

  function byTier(tier: Tier) {
    return clients
      .filter(c => c.tier === tier)
      .sort((a, b) => {
        if (tier === 'new')     return a.full_name.localeCompare(b.full_name)
        if (tier === 'stalled') return (b.daysIdle ?? 0) - (a.daysIdle ?? 0)
        return (a.daysIdle ?? 0) - (b.daysIdle ?? 0)
      })
  }

  function ClientCard({ c }: { c: ClientStats }) {
    const badge = c.timeline ? timelineBadge(c.timeline) : null
    return (
      <div onClick={() => router.push(`/clients/${c.id}`)} style={{
        padding: '12px 16px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: avatarColor(c.full_name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 500,
        }}>
          {initials(c.full_name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{c.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
            {c.tier === 'new'
              ? 'No showings yet'
              : `${c.visitCount}v · ${c.offerCount}o · ${fmtIdle(c.daysIdle!)}`}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          {badge && c.timeline && (
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 8, ...badge }}>
              {TIMELINE_LABELS[c.timeline] ?? c.timeline}
            </span>
          )}
          {c.retainer_required && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--danger)' }}>Retainer</span>
          )}
          {c.flag_reason && (
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warn)' }}>Flagged</span>
          )}
        </div>
      </div>
    )
  }

  function TierSection({ tier }: { tier: Tier }) {
    const list = byTier(tier)
    if (list.length === 0) return null
    const cfg = TIER_CONFIG[tier]
    return (
      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px 6px' }}>
          <TierIcon tier={tier} />
          <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{cfg.desc}</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: 'var(--text3)' }}>{list.length}</span>
        </div>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, margin: '0 16px', overflow: 'hidden',
        }}>
          {list.map((c, i) => (
            <div key={c.id} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <ClientCard c={c} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</h1>
        <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{dateLabel}</p>
      </div>

      {loading ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading…</p>
      ) : clients.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No clients yet</p>
          <p style={{ fontSize: 13, color: 'var(--text2)' }}>Add your first client under Clients.</p>
        </div>
      ) : (
        <div style={{ paddingTop: 4 }}>

          {/* This week */}
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '14px 16px 6px' }}>
                <CalendarIcon />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)' }}>This week</span>
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Upcoming showings</span>
              </div>
              <div style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, margin: '0 16px', overflow: 'hidden',
              }}>
                {upcoming.map((s, i) => (
                  <div key={s.showingId} onClick={() => router.push(`/clients/${s.clientId}`)}
                    style={{
                      padding: '11px 16px', cursor: 'pointer',
                      borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
                      padding: '3px 8px', borderRadius: 8,
                      background: 'var(--brand-light)', color: 'var(--brand)',
                    }}>{fmtUpcoming(s.shown_at)}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.clientName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.address}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TierSection tier="hot" />
          <TierSection tier="warm" />
          <TierSection tier="stalled" />
          <TierSection tier="new" />

        </div>
      )}

      <BottomNav />
    </div>
  )
}
