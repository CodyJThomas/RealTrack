'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { inputStyle, labelStyle } from '@/lib/utils'

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

const BED_OPTIONS   = ['1', '2', '3', '4', '5', '6+']
const BATH_OPTIONS  = ['1', '1.5', '2', '2.5', '3', '3+']
const GARAGE_OPTIONS: { label: string; value: 'none' | 'detached' | 'attached' }[] = [
  { label: 'No garage',  value: 'none'     },
  { label: 'Detached',   value: 'detached' },
  { label: 'Attached',   value: 'attached' },
]

export default function LogShowingPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [clientName,  setClientName]  = useState('')
  const [address,     setAddress]     = useState('')
  const [visitDate,   setVisitDate]   = useState(today)
  const [price,       setPrice]       = useState('')
  const [bedrooms,    setBedrooms]    = useState('')
  const [bathrooms,   setBathrooms]   = useState('')
  const [garage,      setGarage]      = useState<'none' | 'detached' | 'attached' | ''>('')
  const [basement,    setBasement]    = useState(false)
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [recentAddresses, setRecentAddresses] = useState<string[]>([])
  const [addressFromChip, setAddressFromChip] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [{ data: client }, { data: showings }] = await Promise.all([
        supabase.from('clients').select('full_name').eq('id', id).single(),
        supabase.from('showings').select('address').eq('client_id', id)
          .order('shown_at', { ascending: false }).limit(20),
      ])
      if (client) setClientName(client.full_name)
      if (showings) {
        const unique = [...new Set(showings.map((r: { address: string }) => r.address))].slice(0, 5)
        setRecentAddresses(unique)
      }
    }
    loadData()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address.trim()) { setError('Address is required.'); return }
    if (!addressFromChip && (!/\d/.test(address) || address.trim().length < 6)) {
      setError('Enter a street address including a number (e.g. 123 Main St).')
      return
    }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { error: insertError } = await supabase.from('showings').insert({
      client_id: id,
      user_id:   user.id,
      address:   address.trim(),
      shown_at:  new Date(visitDate).toISOString(),
      price:     price    ? parseInt(price.replace(/,/g, ''), 10)  : null,
      bedrooms:  bedrooms ? parseInt(bedrooms, 10)                 : null,
      bathrooms: bathrooms === '3+' ? 3 : bathrooms ? parseFloat(bathrooms) : null,
      garage:    garage   || null,
      basement,
      notes:     notes.trim() || null,
    })

    if (insertError) {
      setError('Failed to save. Please try again.')
      setSaving(false)
      return
    }

    router.push(`/clients/${id}?visit=logged`)
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.push(`/clients/${id}`)}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--brand)' }}>Log Showing</h1>
          {clientName && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{clientName}</div>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Address */}
        <div>
          <label style={labelStyle}>
            Address <span style={{ color: 'var(--danger)' }}>*</span>
            <span style={{ color: 'var(--text3)', fontWeight: 400 }}> (zip not required)</span>
          </label>
          {recentAddresses.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {recentAddresses.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setAddress(a); setAddressFromChip(true) }}
                  style={{
                    padding: '4px 10px', borderRadius: 20, fontSize: 12,
                    border: `1px solid ${address === a ? 'var(--brand)' : 'var(--border)'}`,
                    background: address === a ? 'var(--brand-light)' : 'var(--surface3)',
                    color: address === a ? 'var(--brand)' : 'var(--text2)',
                    cursor: 'pointer', fontWeight: 500,
                    maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          )}
          <input
            style={inputStyle}
            type="text"
            placeholder="123 Main St, Columbus OH"
            value={address}
            onChange={e => { setAddress(e.target.value); setAddressFromChip(false) }}
          />
        </div>

        {/* Date */}
        <div>
          <label style={labelStyle}>Showing date</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: visitDate !== today && visitDate !== yesterday && visitDate !== tomorrow ? 8 : 0 }}>
            <Chip label="Yesterday" active={visitDate === yesterday} onClick={() => setVisitDate(yesterday)} />
            <Chip label="Today"     active={visitDate === today}     onClick={() => setVisitDate(today)}     />
            <Chip label="Tomorrow"  active={visitDate === tomorrow}  onClick={() => setVisitDate(tomorrow)}  />
            <Chip
              label={visitDate !== today && visitDate !== yesterday && visitDate !== tomorrow ? new Date(visitDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Pick date'}
              active={visitDate !== today && visitDate !== yesterday && visitDate !== tomorrow}
              onClick={() => (document.getElementById('date-input') as HTMLInputElement | null)?.showPicker?.()}
            />
          </div>
          <input
            id="date-input"
            style={{ ...inputStyle, display: visitDate !== today && visitDate !== yesterday && visitDate !== tomorrow ? 'block' : 'none' }}
            type="date"
            value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
          />
        </div>

        {/* Price */}
        <div>
          <label style={labelStyle}>
            Listing price <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text3)', fontSize: 15, pointerEvents: 'none',
            }}>$</span>
            <input
              style={{ ...inputStyle, paddingLeft: 24 }}
              type="text"
              inputMode="numeric"
              placeholder="450,000"
              value={price}
              onChange={e => setPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Beds */}
        <div>
          <label style={labelStyle}>Beds</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BED_OPTIONS.map(v => (
              <Chip key={v} label={v} active={bedrooms === v}
                onClick={() => setBedrooms(bedrooms === v ? '' : v)} />
            ))}
          </div>
        </div>

        {/* Baths */}
        <div>
          <label style={labelStyle}>Baths</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BATH_OPTIONS.map(v => (
              <Chip key={v} label={v} active={bathrooms === v}
                onClick={() => setBathrooms(bathrooms === v ? '' : v)} />
            ))}
          </div>
        </div>

        {/* Garage */}
        <div>
          <label style={labelStyle}>Garage</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GARAGE_OPTIONS.map(({ label, value }) => (
              <Chip key={value} label={label} active={garage === value}
                onClick={() => setGarage(garage === value ? '' : value)} />
            ))}
          </div>
        </div>

        {/* Basement */}
        <div>
          <label style={labelStyle}>Basement</label>
          <Chip label={basement ? 'Yes — has basement' : 'No basement'}
            active={basement} onClick={() => setBasement(!basement)} />
        </div>

        {/* Notes */}
        <div>
          <label style={labelStyle}>
            Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            placeholder="Client reaction, price thoughts, dealbreakers…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '14px 16px', borderRadius: 8, border: 'none',
            background: 'var(--brand)', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving…' : 'Log Showing'}
        </button>

      </form>

      <BottomNav />
    </div>
  )
}
