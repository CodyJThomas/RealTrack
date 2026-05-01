'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import type { Client } from '@/lib/types'
import { initials, avatarColor, fmtBudget, sectionLabel } from '@/lib/utils'

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

function StageBadge({ stage }: { stage: string | null }) {
  if (!stage) return null
  const stageColors: Record<string, React.CSSProperties> = {
    active: { background: '#DBEAFE', color: '#1D4ED8' },
    pending: { background: '#FEF3C7', color: 'var(--warn)' },
    closed: { background: '#DCFCE7', color: 'var(--good)' },
    cancelled: { background: '#FEE2E2', color: 'var(--danger)' },
  }
  const style = stageColors[stage.toLowerCase()] ?? { background: 'var(--surface3)', color: 'var(--text2)' }
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 10,
      textTransform: 'uppercase',
      ...style,
    }}>
      {stage}
    </span>
  )
}

export default function ClientDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [client, setClient] = useState<Client | null>(null)
  const [showings, setShowings] = useState<Showing[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)

  useEffect(() => {
    load()
  }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const [
      { data: clientData },
      { data: showingData },
      { data: dealData },
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('showings').select('*').eq('client_id', id).order('shown_at', { ascending: false }),
      supabase.from('deals').select('*').eq('client_id', id),
    ])

    if (!clientData) { router.push('/clients'); return }
    setClient(clientData as Client)

    const rawShowings = (showingData ?? []) as Showing[]
    setShowings(rawShowings)

    const rawDeals = (dealData ?? []) as Omit<Deal, 'offers'>[]
    if (rawDeals.length > 0) {
      const dealIds = rawDeals.map(d => d.id)
      const { data: offerData } = await supabase
        .from('offers')
        .select('*')
        .in('deal_id', dealIds)
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

  if (loading) {
    return (
      <div style={{ paddingBottom: 80 }}>
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
        <BottomNav />
      </div>
    )
  }

  if (!client) return null

  const visitCount = showings.length
  const offerCount = deals.reduce((sum, d) => sum + d.offers.length, 0)
  const progressPct = Math.min(visitCount / 10 * 100, 100)
  const progressColor = visitCount > 6
    ? 'var(--danger)'
    : visitCount > 3
      ? 'var(--warn)'
      : 'var(--brand)'

  const recentShowings = showings.slice(0, 5)
  const budget = fmtBudget(client.budget_min, client.budget_max)

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function fmtAmount(amount: number | null) {
    if (!amount) return '—'
    return `$${amount.toLocaleString()}`
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => router.push('/clients')}
          style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
          }}
        >
          ←
        </button>
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
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Visit activity */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Visit activity</div>
          <div style={{
            height: 8, borderRadius: 4, background: 'var(--surface3)', marginBottom: 12,
          }}>
            <div style={{
              height: '100%', borderRadius: 4,
              width: `${progressPct}%`,
              background: progressColor,
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
              {recentShowings.map((s, i) => (
                <div key={s.id} style={{
                  paddingTop: 8, paddingBottom: 8,
                  borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text1)', flex: 1, paddingRight: 8 }}>
                    {s.address}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                    {fmtDate(s.shown_at)}
                  </span>
                </div>
              ))}
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
                      borderTop: '1px solid var(--border)',
                      fontSize: 13,
                    }}>
                      <div>
                        <span style={{ color: 'var(--text2)', marginRight: 6 }}>
                          {fmtDate(o.offer_date)}
                        </span>
                        {o.direction && (
                          <span style={{ color: 'var(--text3)', marginRight: 6 }}>
                            {o.direction}
                          </span>
                        )}
                        {fmtAmount(o.amount)}
                      </div>
                      {o.status && (
                        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>
                          {o.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            ))
          )}
        </div>

        {/* Notes */}
        {client.notes && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={sectionLabel}>Notes</div>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>{client.notes}</p>
          </div>
        )}

        {/* Client info */}
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
          <a
            href={`/clients/${id}/log-visit`}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 8,
              background: 'var(--brand)', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              textDecoration: 'none', textAlign: 'center',
            }}
          >
            Log visit
          </a>
          <a
            href={`/clients/${id}/log-offer`}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 8,
              background: 'var(--surface3)', color: 'var(--text1)',
              border: '1px solid var(--border)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              textDecoration: 'none', textAlign: 'center',
            }}
          >
            Log offer
          </a>
        </div>

        {/* Danger zone */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Danger zone</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {!client.retainer_required && (
              <button
                onClick={markRetainerRequired}
                disabled={updating}
                style={{
                  padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  color: 'var(--text1)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  opacity: updating ? 0.6 : 1,
                }}
              >
                Mark retainer required
              </button>
            )}
            {archiveConfirm ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  onClick={archiveClient}
                  disabled={updating}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: 8,
                    background: 'var(--danger)', border: 'none',
                    color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    opacity: updating ? 0.6 : 1,
                  }}
                >
                  {updating ? 'Archiving…' : 'Confirm archive'}
                </button>
                <button
                  onClick={() => setArchiveConfirm(false)}
                  style={{
                    padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
                    background: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setArchiveConfirm(true)}
                disabled={updating}
                style={{
                  padding: '12px 16px', borderRadius: 8, textAlign: 'left',
                  background: 'var(--surface3)', border: '1px solid var(--border)',
                  color: 'var(--danger)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
                  opacity: updating ? 0.6 : 1, width: '100%',
                }}
              >
                Archive client
              </button>
            )}
          </div>
        </div>

      </div>

      <BottomNav />

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
