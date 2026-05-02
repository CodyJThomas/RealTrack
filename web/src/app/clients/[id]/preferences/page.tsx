'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { inputStyle, labelStyle } from '@/lib/utils'

function formatPrice(raw: string): string {
  const n = parseInt(raw.replace(/\D/g, ''), 10)
  return isNaN(n) ? '' : n.toLocaleString('en-US')
}

function PriceInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: value ? 'var(--text1)' : 'var(--text3)', fontSize: 15, pointerEvents: 'none',
        }}>$</span>
        <input type="text" inputMode="numeric" placeholder={placeholder}
          value={value ? formatPrice(value) : ''}
          onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
          style={{ ...inputStyle, paddingLeft: 24 }} />
      </div>
    </div>
  )
}

function Stepper({ label, value, onChange, min = 1, max = 8, step = 1 }: {
  label: string; value: number | null; onChange: (v: number | null) => void
  min?: number; max?: number; step?: number
}) {
  const display = value === null ? '—' : (Number.isInteger(value) ? String(value) : value.toFixed(1))
  return (
    <div style={{ flex: 1 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 6 }}>
        <button type="button" onClick={() => {
          if (value === null || value - step < min) onChange(null)
          else onChange(Math.round((value - step) * 10) / 10)
        }} style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: 'var(--surface3)', border: '1px solid var(--border)',
          fontSize: 20, cursor: 'pointer', color: 'var(--text1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>−</button>
        <span style={{
          fontSize: 18, fontWeight: 700, minWidth: 28, textAlign: 'center',
          color: value === null ? 'var(--text3)' : 'var(--text1)',
        }}>{display}</span>
        <button type="button" onClick={() => {
          if (value === null) onChange(min)
          else if (value < max) onChange(Math.round((value + step) * 10) / 10)
        }} style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: 'var(--surface3)', border: '1px solid var(--border)',
          fontSize: 20, cursor: 'pointer', color: 'var(--text1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>+</button>
        {value !== null && (
          <button type="button" onClick={() => onChange(null)} style={{
            background: 'none', border: 'none', fontSize: 12, color: 'var(--text3)', cursor: 'pointer',
          }}>clear</button>
        )}
      </div>
    </div>
  )
}

function ChipInput({ label, chips, onChange, placeholder, presets }: {
  label: string; chips: string[]; onChange: (chips: string[]) => void
  placeholder?: string; presets?: string[]
}) {
  const [input, setInput] = useState('')
  function add(val: string) {
    const clean = val.trim().replace(/,$/, '')
    if (clean && !chips.includes(clean)) onChange([...chips, clean])
  }
  function toggle(val: string) {
    if (chips.includes(val)) onChange(chips.filter(c => c !== val))
    else onChange([...chips, val])
  }
  function commit() { add(input); setInput('') }
  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit() }
    else if (e.key === 'Backspace' && input === '' && chips.length > 0) onChange(chips.slice(0, -1))
  }
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {presets && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {presets.map(p => {
            const active = chips.includes(p)
            return (
              <button key={p} type="button" onClick={() => toggle(p)} style={{
                padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border)'}`,
                background: active ? 'var(--brand-light)' : 'var(--surface3)',
                color: active ? 'var(--brand)' : 'var(--text2)', cursor: 'pointer',
              }}>{p}</button>
            )
          })}
        </div>
      )}
      {chips.filter(c => !presets?.includes(c)).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          {chips.filter(c => !presets?.includes(c)).map(chip => (
            <span key={chip} style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              padding: '4px 8px 4px 10px', borderRadius: 20,
              background: 'var(--brand-light)', color: 'var(--brand)', fontSize: 13, fontWeight: 500,
            }}>
              {chip}
              <button type="button" onClick={() => onChange(chips.filter(c => c !== chip))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand)', fontSize: 15, padding: '0 2px', lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      )}
      <input type="text" value={input} onChange={e => setInput(e.target.value)}
        onKeyDown={handleKey} onBlur={commit}
        placeholder={placeholder ?? 'Type and press Enter to add'} style={inputStyle} />
    </div>
  )
}

function SegmentControl({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void
  options: { label: string; value: string }[]
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', paddingTop: 4 }}>
        {options.map(o => (
          <button key={o.value} type="button" onClick={() => onChange(value === o.value ? '' : o.value)} style={{
            padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500,
            border: `1.5px solid ${value === o.value ? 'var(--brand)' : 'var(--border)'}`,
            background: value === o.value ? 'var(--brand-light)' : 'var(--surface3)',
            color: value === o.value ? 'var(--brand)' : 'var(--text2)', cursor: 'pointer',
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

const PROPERTY_TYPE_PRESETS = ['Single family', 'Townhouse', 'Condo', 'Ranch', 'Two-story', 'Split-level', 'New construction']
const MUST_HAVE_PRESETS     = ['Backyard', 'Home office', 'Main floor laundry', 'Open floor plan', 'Updated kitchen', 'Large lot', 'Pool']
const DEALBREAKER_PRESETS   = ['HOA', 'Busy street', 'No yard', 'Flood zone', 'Major repairs', 'Dated interior']

const GARAGE_OPTIONS = [
  { label: 'No garage', value: 'none' },
  { label: 'Detached',  value: 'detached' },
  { label: 'Attached',  value: 'attached' },
  { label: 'Any',       value: 'any' },
]
const BASEMENT_OPTIONS = [
  { label: 'Required',    value: 'required' },
  { label: 'Preferred',   value: 'preferred' },
  { label: 'Not needed',  value: 'not_needed' },
]
const TIMELINE_OPTIONS = [
  { label: 'ASAP',        value: 'asap' },
  { label: '1–3 months',  value: '1-3 months' },
  { label: '3–6 months',  value: '3-6 months' },
  { label: '6–12 months', value: '6-12 months' },
  { label: 'Flexible',    value: 'flexible' },
]

const sectionHead: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
  color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 14,
}

export default function PreferencesPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [existingId, setExistingId]   = useState<string | null>(null)
  const [clientName, setClientName]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [saving, setSaving]           = useState(false)

  const [priceMin, setPriceMin]               = useState('')
  const [priceMax, setPriceMax]               = useState('')
  const [bedroomsMin, setBedroomsMin]         = useState<number | null>(null)
  const [bathroomsMin, setBathroomsMin]       = useState<number | null>(null)
  const [sqftMin, setSqftMin]                 = useState('')
  const [maxHoa, setMaxHoa]                   = useState('')
  const [timeline, setTimeline]               = useState('')
  const [propertyTypes, setPropertyTypes]     = useState<string[]>([])
  const [garagePreference, setGaragePreference]   = useState('')
  const [basementPreference, setBasementPreference] = useState('')
  const [neighborhoods, setNeighborhoods]     = useState<string[]>([])
  const [schoolDistricts, setSchoolDistricts] = useState<string[]>([])
  const [mustHaves, setMustHaves]             = useState<string[]>([])
  const [dealbreakers, setDealbreakers]       = useState<string[]>([])
  const [styleNotes, setStyleNotes]           = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const [{ data: client }, { data: prefs }] = await Promise.all([
        supabase.from('clients').select('full_name').eq('id', id).single(),
        supabase.from('client_preferences').select('*').eq('client_id', id).maybeSingle(),
      ])

      if (client) setClientName(client.full_name)

      if (prefs) {
        setExistingId(prefs.id)
        setPriceMin(prefs.price_min ? String(prefs.price_min) : '')
        setPriceMax(prefs.price_max ? String(prefs.price_max) : '')
        setBedroomsMin(prefs.bedrooms_min ?? null)
        setBathroomsMin(prefs.bathrooms_min ?? null)
        setSqftMin(prefs.sqft_min ? String(prefs.sqft_min) : '')
        setMaxHoa(prefs.max_hoa != null ? String(prefs.max_hoa) : '')
        setTimeline(prefs.timeline ?? '')
        setPropertyTypes(prefs.property_types ?? [])
        setGaragePreference(prefs.garage_preference ?? '')
        setBasementPreference(prefs.basement_preference ?? '')
        setNeighborhoods(prefs.target_neighborhoods ?? [])
        setSchoolDistricts(prefs.school_districts ?? [])
        setMustHaves(prefs.must_haves ?? [])
        setDealbreakers(prefs.dealbreakers ?? [])
        setStyleNotes(prefs.style_notes ?? '')
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const payload = {
      client_id:            id,
      price_min:            priceMin ? Number(priceMin) : null,
      price_max:            priceMax ? Number(priceMax) : null,
      bedrooms_min:         bedroomsMin,
      bathrooms_min:        bathroomsMin,
      sqft_min:             sqftMin ? Number(sqftMin) : null,
      max_hoa:              maxHoa !== '' ? Number(maxHoa) : null,
      timeline:             timeline || null,
      property_types:       propertyTypes.length > 0 ? propertyTypes : null,
      garage_preference:    garagePreference || null,
      basement_preference:  basementPreference || null,
      target_neighborhoods: neighborhoods.length > 0 ? neighborhoods : null,
      school_districts:     schoolDistricts.length > 0 ? schoolDistricts : null,
      must_haves:           mustHaves.length > 0 ? mustHaves : null,
      dealbreakers:         dealbreakers.length > 0 ? dealbreakers : null,
      style_notes:          styleNotes.trim() || null,
      updated_at:           new Date().toISOString(),
    }

    if (existingId) {
      await supabase.from('client_preferences').update(payload).eq('id', existingId)
    } else {
      await supabase.from('client_preferences').insert(payload)
    }

    router.push(`/clients/${id}?prefs=saved`)
  }

  if (loading) return <p style={{ padding: 24, color: 'var(--text2)' }}>Loading…</p>

  return (
    <div style={{ paddingBottom: 48 }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 36, background: 'var(--surface)', zIndex: 10,
      }}>
        <button onClick={() => router.push(`/clients/${id}`)} style={{
          background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Preferences</div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>{clientName}</div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 28 }}>

        <section>
          <div style={sectionHead}>Timeline</div>
          <SegmentControl label="When do they want to buy?" value={timeline} onChange={setTimeline} options={TIMELINE_OPTIONS} />
        </section>

        <section>
          <div style={sectionHead}>Budget</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <PriceInput label="Min price" value={priceMin} onChange={setPriceMin} placeholder="300,000" />
            <PriceInput label="Max price" value={priceMax} onChange={setPriceMax} placeholder="450,000" />
          </div>
          <div>
            <label style={labelStyle}>Max HOA fee / month ($0 = no HOA)</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: maxHoa ? 'var(--text1)' : 'var(--text3)', fontSize: 15, pointerEvents: 'none',
              }}>$</span>
              <input type="text" inputMode="numeric" placeholder="0" value={maxHoa}
                onChange={e => setMaxHoa(e.target.value.replace(/\D/g, ''))}
                style={{ ...inputStyle, paddingLeft: 24 }} />
            </div>
          </div>
        </section>

        <section>
          <div style={sectionHead}>Property type</div>
          <ChipInput label="Preferred types" chips={propertyTypes} onChange={setPropertyTypes}
            presets={PROPERTY_TYPE_PRESETS} placeholder="Other type… Enter to add" />
        </section>

        <section>
          <div style={sectionHead}>Size requirements</div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <Stepper label="Min bedrooms"  value={bedroomsMin}  onChange={setBedroomsMin} />
            <Stepper label="Min bathrooms" value={bathroomsMin} onChange={setBathroomsMin} step={0.5} max={5} />
          </div>
          <div>
            <label style={labelStyle}>Min sq ft</label>
            <input type="text" inputMode="numeric" placeholder="1,200"
              value={sqftMin ? Number(sqftMin).toLocaleString('en-US') : ''}
              onChange={e => setSqftMin(e.target.value.replace(/\D/g, ''))}
              style={inputStyle} />
          </div>
        </section>

        <section>
          <div style={sectionHead}>Property features</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <SegmentControl label="Garage" value={garagePreference} onChange={setGaragePreference} options={GARAGE_OPTIONS} />
            <SegmentControl label="Basement" value={basementPreference} onChange={setBasementPreference} options={BASEMENT_OPTIONS} />
          </div>
        </section>

        <section>
          <div style={sectionHead}>Location</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ChipInput label="Target neighborhoods" chips={neighborhoods} onChange={setNeighborhoods}
              placeholder="Westside, Downtown… Enter to add" />
            <ChipInput label="School districts" chips={schoolDistricts} onChange={setSchoolDistricts}
              placeholder="Dublin City, Olentangy… Enter to add" />
          </div>
        </section>

        <section>
          <div style={sectionHead}>Property criteria</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ChipInput label="Must-haves" chips={mustHaves} onChange={setMustHaves}
              presets={MUST_HAVE_PRESETS} placeholder="Other must-have… Enter to add" />
            <ChipInput label="Dealbreakers" chips={dealbreakers} onChange={setDealbreakers}
              presets={DEALBREAKER_PRESETS} placeholder="Other dealbreaker… Enter to add" />
          </div>
        </section>

        <section>
          <div style={sectionHead}>Style</div>
          <div>
            <label style={labelStyle}>Notes on style, feel, or vibe</label>
            <textarea value={styleNotes} onChange={e => setStyleNotes(e.target.value)}
              rows={3} placeholder="Modern open floor plan, prefers new construction…"
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>
        </section>

        <button type="submit" disabled={saving} style={{
          padding: '14px 16px', borderRadius: 10, background: 'var(--brand)', color: '#fff',
          border: 'none', fontSize: 15, fontWeight: 700,
          cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1,
        }}>
          {saving ? 'Saving…' : 'Save Preferences'}
        </button>

      </form>
    </div>
  )
}
