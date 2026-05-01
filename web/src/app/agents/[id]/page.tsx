'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import { initials, avatarColor, sectionLabel, inputStyle, labelStyle } from '@/lib/utils'

type Agent = {
  id: string
  full_name: string
  brokerage: string | null
  phone: string | null
  email: string | null
  category: string
  rating: number
  notes: string | null
}

type LinkedDeal = {
  id: string
  address: string
  stage: string | null
  representation: 'buyer' | 'seller'
  client_id: string
  client_name: string
}

const CATEGORY_OPTIONS = ['Preferred', 'Reliable', 'Neutral', 'Difficult', 'Avoid'] as const

const categoryStyle: Record<string, React.CSSProperties> = {
  Preferred: { background: '#DCFCE7', color: 'var(--good)'   },
  Reliable:  { background: '#DBEAFE', color: '#1D4ED8'        },
  Neutral:   { background: 'var(--surface3)', color: 'var(--text2)' },
  Difficult: { background: '#FEF3C7', color: 'var(--warn)'   },
  Avoid:     { background: '#FEE2E2', color: 'var(--danger)' },
}

function stars(n: number) {
  return '★'.repeat(n) + '☆'.repeat(5 - n)
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
      background: active ? 'var(--brand-light)' : 'var(--surface3)',
      color: active ? 'var(--brand)' : 'var(--text2)',
      cursor: 'pointer', transition: 'all 0.1s ease',
    }}>
      {label}
    </button>
  )
}

function RatingChip({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
      border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
      background: active ? 'var(--brand-light)' : 'var(--surface3)',
      color: active ? 'var(--brand)' : 'var(--text2)',
      cursor: 'pointer',
    }}>
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </button>
  )
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

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [agent,   setAgent]   = useState<Agent | null>(null)
  const [deals,   setDeals]   = useState<LinkedDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState<string | null>(null)
  const [archiveConfirm, setArchiveConfirm] = useState(false)
  const [archiving,      setArchiving]      = useState(false)

  // Edit sheet state
  const [editOpen,     setEditOpen]     = useState(false)
  const [editName,     setEditName]     = useState('')
  const [editBrokerage,setEditBrokerage]= useState('')
  const [editPhone,    setEditPhone]    = useState('')
  const [editEmail,    setEditEmail]    = useState('')
  const [editCategory, setEditCategory] = useState<typeof CATEGORY_OPTIONS[number]>('Neutral')
  const [editRating,   setEditRating]   = useState(3)
  const [editNotes,    setEditNotes]    = useState('')
  const [saving,       setSaving]       = useState(false)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: agentData } = await supabase.from('agents').select('*').eq('id', id).single()
    if (!agentData) { router.push('/agents'); return }
    setAgent(agentData as Agent)

    const { data: dealData } = await supabase
      .from('deals').select('id, address, stage, representation, client_id')
      .eq('agent_id', id).order('created_at', { ascending: false })

    if (dealData && dealData.length > 0) {
      const clientIds = [...new Set(dealData.map((d: { client_id: string }) => d.client_id))]
      const { data: clientData } = await supabase
        .from('clients').select('id, full_name').in('id', clientIds)

      const clientMap: Record<string, string> = {}
      for (const c of (clientData ?? []) as { id: string; full_name: string }[]) {
        clientMap[c.id] = c.full_name
      }

      setDeals(dealData.map((d: { id: string; address: string; stage: string | null; representation: 'buyer' | 'seller'; client_id: string }) => ({
        id: d.id, address: d.address, stage: d.stage,
        representation: d.representation, client_id: d.client_id,
        client_name: clientMap[d.client_id] ?? 'Unknown',
      })))
    } else {
      setDeals([])
    }

    setLoading(false)
  }

  function openEdit() {
    if (!agent) return
    setEditName(agent.full_name)
    setEditBrokerage(agent.brokerage ?? '')
    setEditPhone(agent.phone ?? '')
    setEditEmail(agent.email ?? '')
    setEditCategory(agent.category as typeof CATEGORY_OPTIONS[number])
    setEditRating(agent.rating)
    setEditNotes(agent.notes ?? '')
    setEditOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editName.trim()) return
    setSaving(true)
    await supabase.from('agents').update({
      full_name: editName.trim(),
      brokerage: editBrokerage.trim() || null,
      phone:     editPhone.trim() || null,
      email:     editEmail.trim() || null,
      category:  editCategory,
      rating:    editRating,
      notes:     editNotes.trim() || null,
    }).eq('id', id)
    setSaving(false)
    setEditOpen(false)
    setToast('Agent updated')
    await load()
  }

  async function handleArchive() {
    setArchiving(true)
    await supabase.from('agents').update({ archived_at: new Date().toISOString() }).eq('id', id)
    setArchiving(false)
    router.push('/agents')
  }

  if (loading) return (
    <div style={{ paddingBottom: 80 }}>
      <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      <BottomNav />
    </div>
  )

  if (!agent) return null

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.push('/agents')} style={{
          background: 'none', border: 'none', fontSize: 22,
          cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: avatarColor(agent.full_name),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 500, flexShrink: 0,
        }}>
          {initials(agent.full_name)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>{agent.full_name}</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{agent.brokerage ?? 'Independent'}</div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px',
          borderRadius: 10, textTransform: 'uppercase',
          ...categoryStyle[agent.category],
        }}>
          {agent.category}
        </span>
        <button onClick={openEdit} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text2)', padding: 4, marginLeft: 4,
        }}>
          <EditIcon />
        </button>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Profile */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: 'var(--text3)', marginRight: 6 }}>Rating</span>
              <span style={{ letterSpacing: 1 }}>{stars(agent.rating)}</span>
            </div>
            {agent.phone && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text3)', marginRight: 6 }}>Phone</span>
                <a href={`tel:${agent.phone}`} style={{ color: 'var(--brand)', textDecoration: 'none' }}>{agent.phone}</a>
              </div>
            )}
            {agent.email && (
              <div style={{ fontSize: 13 }}>
                <span style={{ color: 'var(--text3)', marginRight: 6 }}>Email</span>
                <a href={`mailto:${agent.email}`} style={{ color: 'var(--brand)', textDecoration: 'none' }}>{agent.email}</a>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        {agent.notes && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={sectionLabel}>Notes</div>
            <p style={{ fontSize: 14, color: 'var(--text1)', lineHeight: 1.5 }}>{agent.notes}</p>
          </div>
        )}

        {/* Linked deals */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Deals</div>
          {deals.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text3)' }}>No deals linked yet.</p>
          ) : (
            deals.map((d, i) => (
              <div key={d.id} data-pressable onClick={() => router.push(`/clients/${d.client_id}`)}
                style={{
                  paddingTop: 10, paddingBottom: 10,
                  borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{d.address}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {d.client_name}
                  {d.stage ? ` · ${d.stage}` : ''}
                  {` · ${d.representation === 'buyer' ? 'Buyer side' : 'Seller side'}`}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Danger zone */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
          <div style={sectionLabel}>Danger zone</div>
          {archiveConfirm ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleArchive} disabled={archiving} style={{
                flex: 1, padding: '12px 16px', borderRadius: 8,
                background: 'var(--danger)', border: 'none',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                opacity: archiving ? 0.6 : 1,
              }}>
                {archiving ? 'Archiving…' : 'Confirm archive'}
              </button>
              <button onClick={() => setArchiveConfirm(false)} style={{
                padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'none', color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
              }}>
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => setArchiveConfirm(true)} style={{
              width: '100%', padding: '12px 16px', borderRadius: 8, textAlign: 'left',
              background: 'var(--surface3)', border: '1px solid var(--border)',
              color: 'var(--danger)', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
              Archive agent
            </button>
          )}
        </div>

      </div>

      <BottomNav />

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
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Edit Agent</h2>
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
                <label style={labelStyle}>Brokerage</label>
                <input type="text" value={editBrokerage} onChange={e => setEditBrokerage(e.target.value)}
                  placeholder="Keller Williams, RE/MAX…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                  placeholder="(555) 000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                  placeholder="agent@brokerage.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORY_OPTIONS.map(c => (
                    <CategoryChip key={c} label={c} active={editCategory === c} onClick={() => setEditCategory(c)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rating</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <RatingChip key={v} value={v} active={editRating === v} onClick={() => setEditRating(v)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)}
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }}
                  placeholder="How they communicate, negotiation style…" />
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
