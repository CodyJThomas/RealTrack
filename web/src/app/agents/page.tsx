'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { Toast } from '@/components/Toast'
import { initials, avatarColor, inputStyle, labelStyle } from '@/lib/utils'

type Agent = {
  id: string
  full_name: string
  brokerage: string | null
  phone: string | null
  email: string | null
  category: 'Preferred' | 'Reliable' | 'Neutral' | 'Difficult' | 'Avoid'
  rating: number
  notes: string | null
  dealCount: number
}

const CATEGORY_OPTIONS = ['Preferred', 'Reliable', 'Neutral', 'Difficult', 'Avoid'] as const

const categoryStyle: Record<string, React.CSSProperties> = {
  Preferred: { background: '#DCFCE7', color: 'var(--good)' },
  Reliable:  { background: '#DBEAFE', color: '#1D4ED8'     },
  Neutral:   { background: 'var(--surface3)', color: 'var(--text2)' },
  Difficult: { background: '#FEF3C7', color: 'var(--warn)' },
  Avoid:     { background: '#FEE2E2', color: 'var(--danger)' },
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px',
      borderRadius: 10, textTransform: 'uppercase',
      ...categoryStyle[category],
    }}>
      {category}
    </span>
  )
}

function RatingChip({ value, active, onClick }: { value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500,
        border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
        background: active ? 'var(--brand-light)' : 'var(--surface3)',
        color: active ? 'var(--brand)' : 'var(--text2)',
        cursor: 'pointer',
      }}
    >
      {'★'.repeat(value)}{'☆'.repeat(5 - value)}
    </button>
  )
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
        border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
        background: active ? 'var(--brand-light)' : 'var(--surface3)',
        color: active ? 'var(--brand)' : 'var(--text2)',
        cursor: 'pointer', transition: 'all 0.1s ease',
      }}
    >
      {label}
    </button>
  )
}

export default function AgentsPage() {
  const router = useRouter()
  const supabase = createClient()

  const [agents,      setAgents]      = useState<Agent[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)

  // Add form state
  const [fullName,   setFullName]   = useState('')
  const [brokerage,  setBrokerage]  = useState('')
  const [phone,      setPhone]      = useState('')
  const [email,      setEmail]      = useState('')
  const [category,   setCategory]   = useState<typeof CATEGORY_OPTIONS[number]>('Neutral')
  const [rating,     setRating]     = useState(3)
  const [notes,      setNotes]      = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: rawAgents } = await supabase
      .from('agents')
      .select('*')
      .is('archived_at', null)
      .order('full_name')

    if (!rawAgents) { setLoading(false); return }

    if (rawAgents.length === 0) { setAgents([]); setLoading(false); return }

    const agentIds = rawAgents.map((a: { id: string }) => a.id)
    const { data: deals } = await supabase
      .from('deals')
      .select('agent_id')
      .in('agent_id', agentIds)

    const dealCountMap: Record<string, number> = {}
    for (const d of (deals ?? []) as { agent_id: string }[]) {
      dealCountMap[d.agent_id] = (dealCountMap[d.agent_id] ?? 0) + 1
    }

    setAgents(rawAgents.map((a: Agent) => ({ ...a, dealCount: dealCountMap[a.id] ?? 0 })))
    setLoading(false)
  }

  function resetForm() {
    setFullName(''); setBrokerage(''); setPhone(''); setEmail('')
    setCategory('Neutral'); setRating(3); setNotes('')
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!fullName.trim()) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    await supabase.from('agents').insert({
      user_id:   user.id,
      full_name: fullName.trim(),
      brokerage: brokerage.trim() || null,
      phone:     phone.trim() || null,
      email:     email.trim() || null,
      category,
      rating,
      notes:     notes.trim() || null,
    })

    setSubmitting(false)
    resetForm()
    setShowAddForm(false)
    setToast('Agent added')
    await load()
  }

  return (
    <div style={{ paddingBottom: 140 }}>
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Agents</h1>
      </div>

      {loading ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      ) : agents.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '60px 24px', gap: 12,
        }}>
          <p style={{ fontWeight: 600, fontSize: 16 }}>No agents yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              marginTop: 4, padding: '10px 20px', borderRadius: 8,
              background: 'var(--brand)', color: '#fff',
              border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Add your first agent
          </button>
        </div>
      ) : (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, margin: '12px 16px',
        }}>
          {agents.map((a, i) => (
            <div
              key={a.id}
              data-pressable
              onClick={() => router.push(`/agents/${a.id}`)}
              style={{
                padding: '14px 16px',
                borderBottom: i < agents.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: '50%',
                background: avatarColor(a.full_name),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: '#fff', fontSize: 13, fontWeight: 500,
              }}>
                {initials(a.full_name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{a.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                  {a.brokerage ?? 'Independent'}
                  {a.dealCount > 0 ? ` · ${a.dealCount} deal${a.dealCount !== 1 ? 's' : ''}` : ''}
                </div>
              </div>
              <CategoryBadge category={a.category} />
            </div>
          ))}
        </div>
      )}

      {/* Add Agent button */}
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
          + Add Agent
        </button>
      </div>

      <BottomNav />

      {/* Add Agent sheet */}
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
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--surface3)' }} />
            </div>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 16px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>New Agent</h2>
              <button
                onClick={() => { setShowAddForm(false); resetForm() }}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)' }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Full name *</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                  placeholder="Sarah Johnson" required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Brokerage</label>
                <input type="text" value={brokerage} onChange={e => setBrokerage(e.target.value)}
                  placeholder="Keller Williams, RE/MAX…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="agent@brokerage.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORY_OPTIONS.map(c => (
                    <CategoryChip key={c} label={c} active={category === c} onClick={() => setCategory(c)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Rating</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5].map(v => (
                    <RatingChip key={v} value={v} active={rating === v} onClick={() => setRating(v)} />
                  ))}
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="How they communicate, negotiation style…"
                  rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
              <button
                type="submit"
                disabled={submitting || !fullName.trim()}
                style={{
                  marginTop: 4, padding: '14px 16px', borderRadius: 10,
                  background: 'var(--brand)', color: '#fff', border: 'none',
                  fontSize: 15, fontWeight: 700,
                  cursor: submitting ? 'default' : 'pointer',
                  opacity: submitting || !fullName.trim() ? 0.6 : 1,
                }}
              >
                {submitting ? 'Saving...' : 'Add Agent'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  )
}
