'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import InfoSheet from '@/components/InfoSheet'
import { sectionLabel, initials, avatarColor } from '@/lib/utils'

type Offer = {
  id: string
  deal_id: string
  offer_date: string
  amount: number
  direction: string
  status: string
}

type Deal = {
  id: string
  stage: string
  address: string
  final_price: number | null
  created_at: string
  clients: { full_name: string } | null
  offers: Offer[]
}

type ShowingRow = {
  id: string
  shown_at: string
  address: string
  clients: { full_name: string } | null
}

function fmtVolume(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

function fmtDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`
}

function fmtAddress(addr: string): string {
  const parts = addr.split(',')
  if (parts.length < 2) return addr
  const city = parts[1].trim()
    .replace(/\s+\d{5}(-\d{4})?$/, '')
    .replace(/\s+[A-Z]{2}$/, '')
    .trim()
  return `${parts[0]}, ${city}`
}

function buildMonths(): { key: string; label: string; count: number }[] {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return {
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('default', { month: 'short' }),
      count: 0,
    }
  })
}

const STAGE_ORDER = ['Active', 'Under Contract', 'Closed', 'Fallen Through']
const STAGE_COLOR: Record<string, string> = {
  'Active':         'var(--brand)',
  'Under Contract': '#7c3aed',
  'Closed':         'var(--good)',
  'Fallen Through': 'var(--danger)',
}

const OFFER_STATUSES = ['Accepted', 'Pending', 'Countered', 'Rejected', 'Withdrawn']
const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  Accepted:  { bg: '#dcfce7', color: '#15803d' },
  Pending:   { bg: '#fef3c7', color: '#92400e' },
  Countered: { bg: '#ede9fe', color: '#6d28d9' },
  Rejected:  { bg: '#fee2e2', color: '#dc2626' },
  Withdrawn: { bg: 'var(--surface3)', color: 'var(--text2)' },
}

function statusBreakdown(offers: Offer[]) {
  return OFFER_STATUSES
    .map(s => ({ status: s, count: offers.filter(o => o.status === s).length }))
    .filter(x => x.count > 0)
}

function InlineAvatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
      background: avatarColor(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 9, fontWeight: 700, color: '#fff', letterSpacing: 0,
    }}>
      {initials(name)}
    </div>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text3)' }}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export default function ReportsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [deals,       setDeals]       = useState<Deal[]>([])
  const [showings,    setShowings]    = useState<ShowingRow[]>([])
  const [clientCount, setClientCount] = useState(0)
  const [loading,     setLoading]     = useState(true)

  const [expandedStage,    setExpandedStage]    = useState<string | null>(null)
  const [expandedMonth,    setExpandedMonth]    = useState<string | null>(null)
  const [expandedOfferDir, setExpandedOfferDir] = useState<'sent' | 'received' | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const today = new Date().toISOString().split('T')[0]

      const [dealsRes, showingsRes, clientsRes] = await Promise.all([
        supabase.from('deals').select('id, stage, address, final_price, created_at, clients!client_id(full_name), offers(id, deal_id, offer_date, amount, direction, status)').eq('user_id', user.id),
        supabase.from('showings').select('id, shown_at, address, clients(full_name)').eq('user_id', user.id).lte('shown_at', today),
        supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('archived_at', null),
      ])

      setDeals((dealsRes.data ?? []).map((d: any) => ({
        ...d,
        clients: Array.isArray(d.clients) ? (d.clients[0] ?? null) : d.clients,
      })) as Deal[])
      setShowings((showingsRes.data ?? []).map((s: any) => ({
        ...s,
        clients: Array.isArray(s.clients) ? (s.clients[0] ?? null) : s.clients,
      })) as ShowingRow[])
      setClientCount(clientsRes.count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived ─────────────────────────────────────────────────────────────────

  const closedVolume = deals
    .filter(d => d.stage === 'Closed')
    .reduce((sum, d) => sum + (d.final_price ?? 0), 0)

  const months = buildMonths()
  showings.forEach(s => {
    const m = months.find(m => m.key === s.shown_at.slice(0, 7))
    if (m) m.count++
  })
  const maxCount = Math.max(...months.map(m => m.count), 1)

  const allOffers      = deals.flatMap(d => d.offers ?? [])
  const sentOffers     = allOffers.filter(o => o.direction === 'sent')
  const receivedOffers = allOffers.filter(o => o.direction === 'received')

  const sentWins    = sentOffers.filter(o => o.status === 'Accepted').length
  const sentLosses  = sentOffers.filter(o => o.status === 'Rejected').length
  const sentWinRate = (sentWins + sentLosses) > 0
    ? Math.round(sentWins / (sentWins + sentLosses) * 100)
    : null

  function toggleStage(stage: string) { setExpandedStage(s => s === stage ? null : stage) }
  function toggleMonth(key: string)   { setExpandedMonth(k => k === key ? null : key) }
  function toggleOfferDir(dir: 'sent' | 'received') { setExpandedOfferDir(d => d === dir ? null : dir) }

  return (
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Reports</h1>
        <InfoSheet
          title="Reports"
          body="A snapshot of your pipeline health, showing activity, and offer outcomes. Tap any row or bar to drill into the detail. Closed Volume reflects final prices on closed deals."
        />
      </div>

      {loading ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      ) : (
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Active Clients', value: clientCount.toString() },
              { label: 'Total Showings', value: showings.length.toString() },
              { label: 'Closed Volume',  value: closedVolume > 0 ? fmtVolume(closedVolume) : '—' },
            ].map(kpi => (
              <div key={kpi.label} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 12, padding: '12px 8px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 20, fontWeight: 700 }}>{kpi.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text2)', marginTop: 3, lineHeight: 1.3 }}>{kpi.label}</div>
              </div>
            ))}
          </div>

          {/* Deal Pipeline */}
          <div>
            <div style={sectionLabel}>Deal Pipeline</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {STAGE_ORDER.map((stage, i) => {
                const stageDeals = deals.filter(d => d.stage === stage)
                const count = stageDeals.length
                const vol   = stageDeals.reduce((s, d) => s + (d.final_price ?? 0), 0)
                const open  = expandedStage === stage
                return (
                  <div key={stage} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <button
                      onClick={() => toggleStage(stage)}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '12px 16px', background: 'none', border: 'none',
                        cursor: count > 0 ? 'pointer' : 'default', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: STAGE_COLOR[stage] ?? 'var(--text3)' }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{stage}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {stage === 'Closed' && vol > 0 && (
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{fmtVolume(vol)}</span>
                        )}
                        <span style={{
                          fontSize: 12, fontWeight: 700, minWidth: 22, textAlign: 'center',
                          background: count > 0 ? STAGE_COLOR[stage] : 'var(--surface3)',
                          color: count > 0 ? '#fff' : 'var(--text3)',
                          borderRadius: 10, padding: '2px 8px',
                        }}>
                          {count}
                        </span>
                        {count > 0 && <Chevron open={open} />}
                      </div>
                    </button>
                    {open && stageDeals.length > 0 && (
                      <div style={{ background: 'var(--surface3)', padding: '0 16px 8px' }}>
                        {stageDeals.map((d, j) => (
                          <div key={d.id} style={{ padding: '8px 0', borderTop: j === 0 ? 'none' : '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', flex: 1 }}>{fmtAddress(d.address)}</span>
                              {d.final_price != null && (
                                <span style={{ fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>{fmtVolume(d.final_price)}</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                              {d.clients?.full_name ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <InlineAvatar name={d.clients.full_name} />
                                  <span style={{ fontSize: 12, color: 'var(--text3)' }}>{d.clients.full_name}</span>
                                </div>
                              ) : <span />}
                              <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(d.created_at.slice(0, 10))}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Showing Trend */}
          <div>
            <div style={sectionLabel}>Showing Trend — Last 6 Months</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 16px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 72, gap: 4, marginBottom: 8 }}>
                {months.map(m => (
                  <button
                    key={m.key}
                    onClick={() => m.count > 0 && toggleMonth(m.key)}
                    style={{
                      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'flex-end', gap: 3, height: '100%',
                      background: 'none', border: 'none', padding: 0,
                      cursor: m.count > 0 ? 'pointer' : 'default',
                    }}
                  >
                    {m.count > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text2)' }}>{m.count}</span>
                    )}
                    <div style={{
                      width: '100%', borderRadius: '3px 3px 0 0',
                      background: expandedMonth === m.key ? 'var(--brand-dark, #0f2040)' : m.count > 0 ? 'var(--brand)' : 'var(--border)',
                      height: `${Math.max((m.count / maxCount) * 56, m.count > 0 ? 8 : 4)}px`,
                    }} />
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                {months.map(m => (
                  <div key={m.key} style={{
                    flex: 1, textAlign: 'center', fontSize: 10,
                    color: expandedMonth === m.key ? 'var(--brand)' : 'var(--text3)',
                    fontWeight: expandedMonth === m.key ? 700 : 400,
                  }}>
                    {m.label}
                  </div>
                ))}
              </div>
              {expandedMonth && (() => {
                const monthShowings = showings
                  .filter(s => s.shown_at.slice(0, 7) === expandedMonth)
                  .sort((a, b) => b.shown_at.localeCompare(a.shown_at))
                return monthShowings.length > 0 ? (
                  <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    {monthShowings.map((s, i) => (
                      <div key={s.id} style={{ padding: '6px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', flex: 1 }}>{fmtAddress(s.address)}</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)', flexShrink: 0 }}>{fmtDate(s.shown_at)}</span>
                        </div>
                        {s.clients?.full_name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                            <InlineAvatar name={s.clients.full_name} />
                            <span style={{ fontSize: 12, color: 'var(--text3)' }}>{s.clients.full_name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : null
              })()}
            </div>
          </div>

          {/* Offer Outcomes */}
          {allOffers.length > 0 && (
            <div>
              <div style={sectionLabel}>Offer Outcomes</div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>

                {sentOffers.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleOfferDir('sent')}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Sent ({sentOffers.length})</span>
                        {sentWinRate !== null && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--good)' }}>{sentWinRate}% win rate</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {statusBreakdown(sentOffers).map(({ status, count }) => {
                            const c = STATUS_CHIP[status] ?? { bg: 'var(--surface3)', color: 'var(--text2)' }
                            return (
                              <span key={status} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color }}>
                                {status} × {count}
                              </span>
                            )
                          })}
                        </div>
                        <Chevron open={expandedOfferDir === 'sent'} />
                      </div>
                    </button>
                    {expandedOfferDir === 'sent' && (
                      <div style={{ background: 'var(--surface3)', padding: '0 16px 8px' }}>
                        {sentOffers
                          .sort((a, b) => b.offer_date.localeCompare(a.offer_date))
                          .map((o, i) => {
                            const deal = deals.find(d => d.id === o.deal_id)
                            const c = STATUS_CHIP[o.status] ?? { bg: 'var(--surface3)', color: 'var(--text2)' }
                            return (
                              <div key={o.id} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', flex: 1 }}>{deal ? fmtAddress(deal.address) : '—'}</span>
                                  <span style={{ fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>{fmtVolume(o.amount)}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: c.bg, color: c.color }}>
                                    {o.status}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  {deal?.clients?.full_name ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <InlineAvatar name={deal.clients.full_name} />
                                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{deal.clients.full_name}</span>
                                    </div>
                                  ) : <span />}
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(o.offer_date)}</span>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}

                {sentOffers.length > 0 && receivedOffers.length > 0 && (
                  <div style={{ height: 1, background: 'var(--border)' }} />
                )}

                {receivedOffers.length > 0 && (
                  <div>
                    <button
                      onClick={() => toggleOfferDir('received')}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        width: '100%', padding: '14px 16px', background: 'none', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>Received ({receivedOffers.length})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {statusBreakdown(receivedOffers).map(({ status, count }) => {
                            const c = STATUS_CHIP[status] ?? { bg: 'var(--surface3)', color: 'var(--text2)' }
                            return (
                              <span key={status} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: c.bg, color: c.color }}>
                                {status} × {count}
                              </span>
                            )
                          })}
                        </div>
                        <Chevron open={expandedOfferDir === 'received'} />
                      </div>
                    </button>
                    {expandedOfferDir === 'received' && (
                      <div style={{ background: 'var(--surface3)', padding: '0 16px 8px' }}>
                        {receivedOffers
                          .sort((a, b) => b.offer_date.localeCompare(a.offer_date))
                          .map((o, i) => {
                            const deal = deals.find(d => d.id === o.deal_id)
                            const c = STATUS_CHIP[o.status] ?? { bg: 'var(--surface3)', color: 'var(--text2)' }
                            return (
                              <div key={o.id} style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text1)', flex: 1 }}>{deal ? fmtAddress(deal.address) : '—'}</span>
                                  <span style={{ fontSize: 12, color: 'var(--text2)', flexShrink: 0 }}>{fmtVolume(o.amount)}</span>
                                  <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, flexShrink: 0, background: c.bg, color: c.color }}>
                                    {o.status}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                                  {deal?.clients?.full_name ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <InlineAvatar name={deal.clients.full_name} />
                                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{deal.clients.full_name}</span>
                                    </div>
                                  ) : <span />}
                                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(o.offer_date)}</span>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}

      <BottomNav />
    </div>
  )
}
