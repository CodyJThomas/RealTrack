'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { inputStyle } from '@/lib/utils'

type Reaction = 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no'

const REACTIONS: { value: Reaction; label: string; short: string; color: string; bg: string }[] = [
  { value: 'strong_yes', label: 'Strong yes',  short: '★★', color: '#16a34a', bg: '#dcfce7' },
  { value: 'yes',        label: 'Yes',          short: '★',  color: '#65a30d', bg: '#ecfccb' },
  { value: 'maybe',      label: 'Maybe',        short: '~',  color: '#ca8a04', bg: '#fef9c3' },
  { value: 'no',         label: 'No',           short: '✕',  color: '#ea580c', bg: '#ffedd5' },
  { value: 'strong_no',  label: 'Strong no',    short: '✕✕', color: '#dc2626', bg: '#fee2e2' },
]

const PRICE_OPTIONS = ['Too high', 'A bit high', 'Fair', 'Good value']

const CHIPS_BY_REACTION: Record<Reaction, string[]> = {
  strong_yes: ['Great layout', 'Perfect size', 'Love the neighborhood', 'Updated finishes', 'Great natural light', 'Loved the yard', 'Great value', 'Move-in ready'],
  yes:        ['Good layout', 'Right size', 'Nice neighborhood', 'Good finishes', 'Good light', 'Nice yard', 'Fair price'],
  maybe:      ['Good bones', 'Needs some work', 'Worth a second look', 'Location is right', 'Price is the issue', 'Layout concern'],
  no:         ['Wrong neighborhood', 'Too small', 'Bad layout', 'Needs too much work', 'Parking issues', 'No yard'],
  strong_no:  ['Dealbreaker found', 'Way too small', 'Wrong area entirely', 'Major repairs needed', 'Price way off', 'Not their style'],
}

export function reactionColor(r: string | null): string {
  return REACTIONS.find(x => x.value === r)?.color ?? 'var(--text3)'
}
export function reactionBg(r: string | null): string {
  return REACTIONS.find(x => x.value === r)?.bg ?? 'var(--surface3)'
}
export function reactionLabel(r: string | null): string {
  return REACTIONS.find(x => x.value === r)?.label ?? '—'
}

export default function ReactPage() {
  const router = useRouter()
  const params = useParams()
  const clientId  = params.id as string
  const showingId = params.showingId as string
  const supabase  = createClient()

  const [address,      setAddress]      = useState('')
  const [clientName,   setClientName]   = useState('')
  const [showingPrice, setShowingPrice] = useState<number | null>(null)
  const [existingId,   setExistingId]   = useState<string | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)

  const [reaction,       setReaction]       = useState<Reaction | ''>('')
  const [priceReaction,  setPriceReaction]  = useState('')
  const [standoutChips,  setStandoutChips]  = useState<string[]>([])
  const [standoutNotes,  setStandoutNotes]  = useState('')
  const [dealbreaker,    setDealbreaker]    = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [
        { data: showing },
        { data: client },
        { data: existing },
      ] = await Promise.all([
        supabase.from('showings').select('address, price').eq('id', showingId).single(),
        supabase.from('clients').select('full_name').eq('id', clientId).single(),
        supabase.from('showing_reactions').select('*').eq('showing_id', showingId).maybeSingle(),
      ])

      if (showing) { setAddress(showing.address); setShowingPrice(showing.price) }
      if (client)  setClientName(client.full_name)

      if (existing) {
        setExistingId(existing.id)
        const r = existing.overall_reaction as Reaction | ''
        setReaction(REACTIONS.find(x => x.value === r) ? r : '')
        setPriceReaction(existing.price_reaction ?? '')
        setStandoutNotes(existing.reaction_notes ?? '')
        setDealbreaker(existing.dealbreaker_reason ?? '')
      }

      setLoading(false)
    }
    load()
  }, [showingId, clientId])

  function toggleChip(chip: string) {
    if (standoutChips.includes(chip)) {
      setStandoutChips(c => c.filter(x => x !== chip))
      setStandoutNotes(n => n.replace(chip, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim())
    } else {
      setStandoutChips(c => [...c, chip])
      setStandoutNotes(n => n ? `${n}, ${chip}` : chip)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!reaction) return
    setSaving(true)

    const payload = {
      showing_id:        showingId,
      client_id:         clientId,
      overall_reaction:  reaction,
      price_reaction:    priceReaction || null,
      reaction_notes:    standoutNotes.trim() || null,
      dealbreaker_reason: dealbreaker.trim() || null,
    }

    if (existingId) {
      await supabase.from('showing_reactions').update(payload).eq('id', existingId)
    } else {
      await supabase.from('showing_reactions').insert(payload)
    }

    router.push(`/clients/${clientId}?visit=logged`)
  }

  async function handleClear() {
    if (!existingId) return
    await supabase.from('showing_reactions').delete().eq('id', existingId)
    router.push(`/clients/${clientId}`)
  }

  const chips = reaction ? CHIPS_BY_REACTION[reaction] : []
  const showDealbreaker = reaction === 'no' || reaction === 'strong_no'

  if (loading) return <p style={{ padding: 24, color: 'var(--text2)' }}>Loading…</p>

  return (
    <div style={{ paddingBottom: 48 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 36, background: 'var(--surface)', zIndex: 10,
      }}>
        <button onClick={() => router.push(`/clients/${clientId}`)} style={{
          background: 'none', border: 'none', fontSize: 22,
          cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Reaction</div>
          <div style={{ fontSize: 12, color: 'var(--text2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {clientName} · {address}
          </div>
        </div>
        <button onClick={() => router.push(`/clients/${clientId}?visit=logged`)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, color: 'var(--text3)', padding: 0,
        }}>Skip</button>
      </div>

      <form onSubmit={handleSave} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Overall reaction */}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>
            How did the client react?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {REACTIONS.map(r => (
              <button key={r.value} type="button" onClick={() => {
                setReaction(reaction === r.value ? '' : r.value)
                setStandoutChips([])
                setStandoutNotes('')
              }} style={{
                padding: '14px 16px', borderRadius: 10, textAlign: 'left',
                border: `2px solid ${reaction === r.value ? r.color : 'var(--border)'}`,
                background: reaction === r.value ? r.bg : 'var(--surface3)',
                color: reaction === r.value ? r.color : 'var(--text1)',
                fontSize: 15, fontWeight: reaction === r.value ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.1s ease',
              }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price reaction — only if showing had a price */}
        {showingPrice && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>
              On the price (${showingPrice.toLocaleString()})
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {PRICE_OPTIONS.map(p => (
                <button key={p} type="button" onClick={() => setPriceReaction(priceReaction === p ? '' : p)} style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
                  border: `1.5px solid ${priceReaction === p ? 'var(--brand)' : 'var(--border)'}`,
                  background: priceReaction === p ? 'var(--brand-light)' : 'var(--surface3)',
                  color: priceReaction === p ? 'var(--brand)' : 'var(--text2)',
                  cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
        )}

        {/* What stood out — chips + freeform, only after reaction selected */}
        {reaction && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>
              What stood out?
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {chips.map(chip => (
                <button key={chip} type="button" onClick={() => toggleChip(chip)} style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  border: `1.5px solid ${standoutChips.includes(chip) ? 'var(--brand)' : 'var(--border)'}`,
                  background: standoutChips.includes(chip) ? 'var(--brand-light)' : 'var(--surface3)',
                  color: standoutChips.includes(chip) ? 'var(--brand)' : 'var(--text2)',
                  cursor: 'pointer',
                }}>{chip}</button>
              ))}
            </div>
            <textarea
              value={standoutNotes}
              onChange={e => setStandoutNotes(e.target.value)}
              rows={2}
              placeholder="Anything else to note…"
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </div>
        )}

        {/* Dealbreaker — only for No / Strong no */}
        {showDealbreaker && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>
              Dealbreaker reason
            </div>
            <input
              type="text"
              value={dealbreaker}
              onChange={e => setDealbreaker(e.target.value)}
              placeholder="What specifically ruled it out?"
              style={inputStyle}
            />
          </div>
        )}

        <button type="submit" disabled={saving || !reaction} style={{
          padding: '14px 16px', borderRadius: 10,
          background: reaction ? (REACTIONS.find(r => r.value === reaction)?.color ?? 'var(--brand)') : 'var(--surface3)',
          color: reaction ? '#fff' : 'var(--text3)',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: saving || !reaction ? 'default' : 'pointer',
          opacity: saving ? 0.6 : 1,
          transition: 'background 0.15s ease',
        }}>
          {saving ? 'Saving…' : existingId ? 'Update Reaction' : 'Save Reaction'}
        </button>

        {/* Clear reaction — only when editing */}
        {existingId && (
          <div style={{ textAlign: 'center' }}>
            {confirmClear ? (
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button type="button" onClick={handleClear} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'var(--danger)', color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Confirm clear</button>
                <button type="button" onClick={() => setConfirmClear(false)} style={{
                  padding: '10px 20px', borderRadius: 8,
                  background: 'none', color: 'var(--text2)',
                  border: '1px solid var(--border)', fontSize: 14, cursor: 'pointer',
                }}>Cancel</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmClear(true)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: 'var(--text3)', textDecoration: 'underline',
              }}>Clear reaction</button>
            )}
          </div>
        )}

      </form>
    </div>
  )
}
