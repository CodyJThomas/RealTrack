'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import type { Client } from '@/lib/types'
import { initials, avatarColor, fmtBudget, sectionLabel, inputStyle, labelStyle } from '@/lib/utils'

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
}

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

  const [client,   setClient]   = useState<Client | null>(null)
  const [prefs,    setPrefs]    = useState<ClientPrefs | null>(null)
  const [showings, setShowings] = useState<Showing[]>([])
  const [deals,    setDeals]    = useState<Deal[]>([])
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
    ] = await Promise.all([
      supabase.from('clients').select('*').eq('id', id).single(),
      supabase.from('showings').select('*').eq('client_id', id).order('shown_at', { ascending: false }),
      supabase.from('deals').select('*').eq('client_id', id),
      supabase.from('client_preferences').select('*').eq('client_id', id).maybeSingle(),
    ])

    if (!clientData) { router.push('/clients'); return }
    setClient(clientData as Client)
    setPrefs((prefsData as ClientPrefs | null) ?? null)

    const rawShowings = (showingData ?? []) as Showing[]
    setShowings(rawShowings)

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

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

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
              {recentShowings.map((s, i) => (
                <div key={s.id} style={{
                  paddingTop: 8, paddingBottom: 8,
                  borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text1)', flex: 1, paddingRight: 8 }}>{s.address}</span>
                  <span style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{fmtDate(s.shown_at)}</span>
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
        {prefs && (fmtArray(prefs.target_neighborhoods) || fmtArray(prefs.must_haves) || fmtArray(prefs.dealbreakers) || prefs.style_notes || prefs.bedrooms_min || prefs.bathrooms_min) && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={sectionLabel}>Preferences</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prefs.bedrooms_min && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Min beds</span>
                  <span>{prefs.bedrooms_min}+</span>
                </div>
              )}
              {prefs.bathrooms_min && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Min baths</span>
                  <span>{prefs.bathrooms_min}+</span>
                </div>
              )}
              {fmtArray(prefs.target_neighborhoods) && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Neighborhoods</span>
                  <span>{fmtArray(prefs.target_neighborhoods)}</span>
                </div>
              )}
              {fmtArray(prefs.must_haves) && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Must-haves</span>
                  <span>{fmtArray(prefs.must_haves)}</span>
                </div>
              )}
              {fmtArray(prefs.dealbreakers) && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Dealbreakers</span>
                  <span>{fmtArray(prefs.dealbreakers)}</span>
                </div>
              )}
              {prefs.style_notes && (
                <div style={{ fontSize: 13 }}>
                  <span style={{ color: 'var(--text3)', marginRight: 6 }}>Style</span>
                  <span>{prefs.style_notes}</span>
                </div>
              )}
            </div>
          </div>
        )}

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
