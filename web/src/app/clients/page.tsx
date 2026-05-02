'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import InfoSheet from '@/components/InfoSheet'
import type { Client } from '@/lib/types'
import { initials, avatarColor, sectionLabel, inputStyle, labelStyle, fmtBudget } from '@/lib/utils'

type FilterTab = 'All' | 'Good' | 'Flagged' | 'Retainer'

type ClientWithCounts = Client & { visitCount: number; offerCount: number }

function Badge({ type }: { type: 'good' | 'flagged' | 'retainer' }) {
  const styles: Record<string, React.CSSProperties> = {
    good: { background: '#DCFCE7', color: 'var(--good)' },
    flagged: { background: '#FEF3C7', color: 'var(--warn)' },
    retainer: { background: '#FEE2E2', color: 'var(--danger)' },
  }
  const labels = { good: 'Good', flagged: 'Flagged', retainer: 'Retainer req.' }
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      borderRadius: 10,
      textTransform: 'uppercase',
      ...styles[type],
    }}>
      {labels[type]}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: avatarColor(name),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      color: '#fff',
      fontSize: 13,
      fontWeight: 500,
    }}>
      {initials(name)}
    </div>
  )
}

export default function ClientsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [clients, setClients] = useState<ClientWithCounts[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterTab>('All')
  const [showAddForm, setShowAddForm] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  // Add form state
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [budgetMin, setBudgetMin] = useState('')
  const [budgetMax, setBudgetMax] = useState('')
  const [retainerRequired, setRetainerRequired] = useState(false)
  const [notes, setNotes] = useState('')
  const [targetNeighborhoods, setTargetNeighborhoods] = useState('')
  const [mustHaves, setMustHaves] = useState('')
  const [dealbreakers, setDealbreakers] = useState('')
  const [styleNotes, setStyleNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPrefs, setShowPrefs] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: rawClients } = await supabase
      .from('clients')
      .select('*')
      .is('archived_at', null)
      .order('full_name')

    if (!rawClients) { setError('Failed to load clients'); setLoading(false); return }

    const clientList: Client[] = rawClients ?? []
    if (clientList.length === 0) {
      setClients([])
      setLoading(false)
      return
    }

    const clientIds = clientList.map(c => c.id)

    const [{ data: showings }, { data: deals }] = await Promise.all([
      supabase.from('showings').select('client_id').in('client_id', clientIds),
      supabase.from('deals').select('id, client_id').in('client_id', clientIds),
    ])

    const dealIds = (deals ?? []).map((d: { id: string; client_id: string }) => d.id)
    const { data: offers } = dealIds.length > 0
      ? await supabase.from('offers').select('deal_id').in('deal_id', dealIds)
      : { data: [] }

    // Count visits per client
    const visitMap: Record<string, number> = {}
    for (const s of (showings ?? [])) {
      const row = s as { client_id: string }
      visitMap[row.client_id] = (visitMap[row.client_id] ?? 0) + 1
    }

    // Count offers per client (via deals)
    const dealClientMap: Record<string, string> = {}
    for (const d of (deals ?? [])) {
      const row = d as { id: string; client_id: string }
      dealClientMap[row.id] = row.client_id
    }
    const offerMap: Record<string, number> = {}
    for (const o of (offers ?? [])) {
      const row = o as { deal_id: string }
      const clientId = dealClientMap[row.deal_id]
      if (clientId) offerMap[clientId] = (offerMap[clientId] ?? 0) + 1
    }

    const enriched: ClientWithCounts[] = clientList.map(c => ({
      ...c,
      visitCount: visitMap[c.id] ?? 0,
      offerCount: offerMap[c.id] ?? 0,
    }))

    setClients(enriched)
    setLoading(false)
  }

  function filtered() {
    return clients.filter(c => {
      if (filter === 'Flagged') return !!c.flag_reason
      if (filter === 'Retainer') return c.retainer_required
      if (filter === 'Good') return !c.flag_reason && !c.retainer_required
      return true
    })
  }

  function resetForm() {
    setFullName('')
    setPhone('')
    setEmail('')
    setBudgetMin('')
    setBudgetMax('')
    setRetainerRequired(false)
    setNotes('')
    setTargetNeighborhoods('')
    setMustHaves('')
    setDealbreakers('')
    setStyleNotes('')
    setShowPrefs(false)
  }

  async function handleAddClient(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: inserted, error } = await supabase.from('clients').insert({
      user_id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      retainer_required: retainerRequired,
      notes: notes.trim() || null,
    }).select().single()

    if (!error && inserted) {
      const hasPrefs = targetNeighborhoods.trim() || mustHaves.trim() || dealbreakers.trim() || styleNotes.trim()
      if (hasPrefs) {
        await supabase.from('client_preferences').insert({
          client_id: inserted.id,
          target_neighborhoods: targetNeighborhoods.trim()
            ? targetNeighborhoods.split(',').map(s => s.trim()).filter(Boolean)
            : null,
          must_haves: mustHaves.trim()
            ? mustHaves.split(',').map(s => s.trim()).filter(Boolean)
            : null,
          dealbreakers: dealbreakers.trim()
            ? dealbreakers.split(',').map(s => s.trim()).filter(Boolean)
            : null,
          style_notes: styleNotes.trim() || null,
        })
      }
    }

    setSubmitting(false)
    resetForm()
    setToast('Client added')
    setShowAddForm(false)
    await load()
  }

  const tabs: FilterTab[] = ['All', 'Good', 'Flagged', 'Retainer']
  const tabLabels: Record<FilterTab, string> = {
    All: 'All',
    Good: 'Good standing',
    Flagged: 'Flagged',
    Retainer: 'Retainer req.',
  }

  const chipCounts: Record<FilterTab, number> = {
    All: clients.length,
    Good: clients.filter(c => !c.flag_reason && !c.retainer_required).length,
    Flagged: clients.filter(c => !!c.flag_reason).length,
    Retainer: clients.filter(c => c.retainer_required).length,
  }

  const displayClients = filtered()

  return (
    <div style={{ paddingBottom: 140 }}>
      {/* Header */}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Clients</h1>
        <InfoSheet
          title="Clients"
          body="All your active buyers and sellers. Tap a client to view their profile, preference history, and showing reactions. Use the filter chips to surface flagged clients or those requiring a retainer."
        />
      </div>

      {/* Filter chips */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 16px',
        borderBottom: '1px solid var(--border)', overflowX: 'auto',
        WebkitOverflowScrolling: 'touch' as const,
      }}>
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            style={{
              padding: '5px 12px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: filter === tab ? 'var(--brand)' : 'var(--surface3)',
              color: filter === tab ? '#fff' : 'var(--text2)',
            }}
          >
            {tabLabels[tab]}{chipCounts[tab] > 0 ? ` (${chipCounts[tab]})` : ''}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      ) : error ? (
        <p style={{ padding: 24, color: 'var(--danger)', fontSize: 14 }}>{error}</p>
      ) : clients.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', padding: '60px 24px', gap: 12,
        }}>
          <p style={{ fontWeight: 600, fontSize: 16 }}>No clients yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              marginTop: 4, padding: '10px 20px', borderRadius: 8,
              background: 'var(--brand)', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add your first client
          </button>
        </div>
      ) : displayClients.length === 0 ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>No clients in this category.</p>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, margin: '12px 16px' }}>
          {displayClients.map((c, i) => {
            const isLast = i === displayClients.length - 1
            const noOfferAlert = c.visitCount >= 5 && c.offerCount === 0
            return (
              <div
                key={c.id}
                data-pressable
                onClick={() => router.push(`/clients/${c.id}`)}
                style={{
                  padding: '14px 16px',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  cursor: 'pointer',
                }}
              >
                <Avatar name={c.full_name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text1)' }}>{c.full_name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    {c.visitCount} visit{c.visitCount !== 1 ? 's' : ''} · {c.offerCount} offer{c.offerCount !== 1 ? 's' : ''}{fmtBudget(c.budget_min, c.budget_max) ? ` · ${fmtBudget(c.budget_min, c.budget_max)}` : ''}
                  </div>
                  {noOfferAlert && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: 4,
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: 10,
                      textTransform: 'uppercase',
                      background: '#FEF3C7',
                      color: 'var(--warn)',
                    }}>
                      No offers yet
                    </span>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {c.retainer_required
                    ? <Badge type="retainer" />
                    : c.flag_reason
                      ? <Badge type="flagged" />
                      : <Badge type="good" />
                  }
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-flag tooltip */}
      {!loading && clients.length > 0 && (
        <p style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'center', padding: '0 16px 12px' }}>
          Clients auto-flagged at 5+ visits with &lt;2 offers
        </p>
      )}

      {/* Add Client button */}
      <div style={{
        position: 'fixed', bottom: 60, left: 0, right: 0,
        padding: '8px 16px', background: 'var(--surface)', borderTop: '1px solid var(--border)',
      }}>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 10,
            background: 'var(--brand)', color: '#fff',
            border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}
        >
          + Add Client
        </button>
      </div>

      <BottomNav />

      {/* Add Client overlay */}
      {showAddForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 100, display: 'flex', alignItems: 'flex-end',
        }}>
          <div style={{
            background: 'var(--surface)', borderRadius: '16px 16px 0 0',
            width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: '0 0 32px',
          }}>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface3)' }} />
            </div>

            {/* Form header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>New Client</h2>
              <button
                onClick={() => { setShowAddForm(false); resetForm() }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAddClient} style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Full name */}
              <div>
                <label style={labelStyle}>Full name *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                  style={inputStyle}
                />
              </div>

              {/* Phone */}
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  style={inputStyle}
                />
              </div>

              {/* Email */}
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  style={inputStyle}
                />
              </div>

              {/* Budget */}
              <div>
                <label style={labelStyle}>Budget range ($)</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetMin}
                    onChange={e => setBudgetMin(e.target.value)}
                    placeholder="Min"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={budgetMax}
                    onChange={e => setBudgetMax(e.target.value)}
                    placeholder="Max"
                    style={{ ...inputStyle, flex: 1 }}
                  />
                </div>
              </div>

              {/* Retainer */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={retainerRequired}
                  onChange={e => setRetainerRequired(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
                />
                <span style={{ fontSize: 14, color: 'var(--text1)' }}>Retainer required</span>
              </label>

              {/* Notes */}
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any notes about this client..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                />
              </div>

              {/* Preferences section */}
              <div style={{ paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <button
                  type="button"
                  onClick={() => setShowPrefs(p => !p)}
                  style={{
                    background: 'none', border: 'none', padding: '10px 0',
                    fontSize: 13, fontWeight: 600, color: 'var(--brand)',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}
                >
                  {showPrefs ? '− Hide preferences' : '＋ Add preferences'}
                </button>
                {showPrefs && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Target neighborhoods (comma-separated)</label>
                      <input
                        type="text"
                        value={targetNeighborhoods}
                        onChange={e => setTargetNeighborhoods(e.target.value)}
                        placeholder="Downtown, Westside, Oakwood"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Must-haves (comma-separated)</label>
                      <input
                        type="text"
                        value={mustHaves}
                        onChange={e => setMustHaves(e.target.value)}
                        placeholder="Garage, Backyard, Open kitchen"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Dealbreakers (comma-separated)</label>
                      <input
                        type="text"
                        value={dealbreakers}
                        onChange={e => setDealbreakers(e.target.value)}
                        placeholder="HOA, No yard, Busy street"
                        style={inputStyle}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>Style notes</label>
                      <textarea
                        value={styleNotes}
                        onChange={e => setStyleNotes(e.target.value)}
                        placeholder="Prefers modern, open floor plans..."
                        rows={2}
                        style={{ ...inputStyle, resize: 'vertical' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting || !fullName.trim()}
                style={{
                  marginTop: 4,
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--brand)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting || !fullName.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? 'Saving...' : 'Add Client'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
