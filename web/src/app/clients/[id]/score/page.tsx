'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { inputStyle, labelStyle } from '@/lib/utils'
import { scoreProperty } from '@/lib/intelligence'
import type { PropertyInput, PropertyScore, DimensionScore } from '@/lib/intelligence'
import type { ClientPreference } from '@/lib/types'

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
const PROPERTY_TYPE_OPTIONS = ['Single family', 'Townhouse', 'Condo', 'Ranch', 'Two-story', 'New construction']
const GARAGE_OPTIONS: { label: string; value: 'none' | 'detached' | 'attached' }[] = [
  { label: 'None',      value: 'none'     },
  { label: 'Detached',  value: 'detached' },
  { label: 'Attached',  value: 'attached' },
]

function extractAddressFromUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim())
    const host = url.hostname.replace('www.', '')

    if (host === 'zillow.com') {
      const match = url.pathname.match(/\/homedetails\/([^/]+)\//)
      if (!match) return null
      const slug = match[1]
      const parts = slug.split('-')
      // Drop trailing segment that's all digits (zip code)
      const trimmed = /^\d+$/.test(parts[parts.length - 1]) ? parts.slice(0, -1) : parts
      return trimmed.join(' ')
    }

    if (host === 'realtor.com') {
      const match = url.pathname.match(/\/realestateandhomes-detail\/([^/]+)/)
      if (!match) return null
      const slug = match[1]
      // Strip trailing _M... suffix, then replace underscores/hyphens with spaces
      return slug.replace(/_M[^_]*$/, '').replace(/[_-]/g, ' ')
    }
  } catch {
    // Not a URL
  }
  return null
}

const dotColor: Record<DimensionScore['status'], string> = {
  green: '#16a34a',
  amber: '#d97706',
  red:   '#dc2626',
  gray:  '#9CA3AF',
}

const overallConfig: Record<PropertyScore['overall'], { label: string; bg: string; color: string }> = {
  strong: { label: 'Strong Fit',  bg: '#DCFCE7', color: '#16a34a' },
  good:   { label: 'Good Fit',    bg: '#DBEAFE', color: '#1D4ED8' },
  fair:   { label: 'Fair Fit',    bg: '#FEF3C7', color: '#B45309' },
  poor:   { label: 'Poor Fit',    bg: '#FEE2E2', color: '#B91C1C' },
}

export default function ScorePropertyPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [clientName, setClientName]   = useState('')
  const [prefs, setPrefs]             = useState<ClientPreference | null>(null)
  const [loading, setLoading]         = useState(true)
  const [noPrefs, setNoPrefs]         = useState(false)

  // Form state
  const [address,       setAddress]       = useState('')
  const [urlHint,       setUrlHint]       = useState(false)
  const [price,         setPrice]         = useState('')
  const [hoa,           setHoa]           = useState('')
  const [bedrooms,      setBedrooms]      = useState('')
  const [bathrooms,     setBathrooms]     = useState('')
  const [propertyType,  setPropertyType]  = useState('')
  const [garage,        setGarage]        = useState<'none' | 'detached' | 'attached' | ''>('')
  const [basement,      setBasement]      = useState(false)
  const [sqft,          setSqft]          = useState('')

  // Must-haves / dealbreakers checked state
  const [mustHavesPresent,    setMustHavesPresent]    = useState<string[]>([])
  const [dealbreakersPresent, setDealbrakersPresent]  = useState<string[]>([])

  const [result, setResult] = useState<PropertyScore | null>(null)

  useEffect(() => {
    async function load() {
      const [{ data: client }, { data: prefsData }] = await Promise.all([
        supabase.from('clients').select('full_name').eq('id', id).single(),
        supabase.from('client_preferences').select('*').eq('client_id', id).maybeSingle(),
      ])
      if (client) setClientName(client.full_name)
      if (!prefsData) {
        setNoPrefs(true)
      } else {
        setPrefs(prefsData as ClientPreference)
      }
      setLoading(false)
    }
    load()
  }, [id])

  function handleAddressPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData('text')
    const extracted = extractAddressFromUrl(pasted)
    if (extracted) {
      e.preventDefault()
      setAddress(extracted)
      setUrlHint(true)
    } else {
      setUrlHint(false)
    }
  }

  function handleScore() {
    if (!prefs) return
    const input: PropertyInput = {
      address,
      price:         price ? parseInt(price.replace(/\D/g, ''), 10) : null,
      bedrooms:      bedrooms ? (bedrooms === '6+' ? 6 : parseInt(bedrooms, 10)) : null,
      bathrooms:     bathrooms ? (bathrooms === '3+' ? 3 : parseFloat(bathrooms)) : null,
      sqft:          sqft ? parseInt(sqft.replace(/\D/g, ''), 10) : null,
      garage:        garage || null,
      basement,
      property_type: propertyType || null,
      hoa:           hoa ? parseInt(hoa.replace(/\D/g, ''), 10) : null,
      mustHavesPresent,
      dealbreakersPresent,
    }
    setResult(scoreProperty(input, prefs))
  }

  if (loading) return (
    <div style={{ paddingBottom: 80 }}>
      <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      <BottomNav />
    </div>
  )

  if (noPrefs) return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.push(`/clients/${id}`)} style={{
          background: 'none', border: 'none', fontSize: 22,
          cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--brand)' }}>Score a Property</h1>
      </div>
      <div style={{ padding: '32px 16px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>
          No preference profile found. Add preferences first so scoring has something to compare against.
        </p>
        <button
          onClick={() => router.push(`/clients/${id}/preferences`)}
          style={{
            padding: '12px 20px', borderRadius: 8,
            background: 'var(--brand)', color: '#fff',
            border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Set up preferences
        </button>
      </div>
      <BottomNav />
    </div>
  )

  const hasMustHaves   = prefs && prefs.must_haves   && prefs.must_haves.length > 0
  const hasDealbreakers = prefs && prefs.dealbreakers && prefs.dealbreakers.length > 0

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => router.push(`/clients/${id}`)} style={{
          background: 'none', border: 'none', fontSize: 22,
          cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
        }}>←</button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--brand)' }}>Score a Property</h1>
          {clientName && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{clientName}</div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* Address */}
        <div>
          <label style={labelStyle}>Address</label>
          <input
            style={inputStyle}
            type="text"
            placeholder="123 Main St, Columbus OH — or paste a Zillow/Realtor URL"
            value={address}
            onChange={e => { setAddress(e.target.value); setUrlHint(false) }}
            onPaste={handleAddressPaste}
          />
          {urlHint && (
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Address filled from URL
            </div>
          )}
        </div>

        {/* Price */}
        <div>
          <label style={labelStyle}>
            Listing price <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: price ? 'var(--text1)' : 'var(--text3)', fontSize: 15, pointerEvents: 'none',
            }}>$</span>
            <input
              style={{ ...inputStyle, paddingLeft: 24 }}
              type="text"
              inputMode="numeric"
              placeholder="450,000"
              value={price ? parseInt(price.replace(/\D/g, '') || '0', 10).toLocaleString('en-US') : ''}
              onChange={e => setPrice(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        {/* HOA */}
        <div>
          <label style={labelStyle}>
            HOA (monthly) <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: hoa ? 'var(--text1)' : 'var(--text3)', fontSize: 15, pointerEvents: 'none',
            }}>$</span>
            <input
              style={{ ...inputStyle, paddingLeft: 24 }}
              type="text"
              inputMode="numeric"
              placeholder="200"
              value={hoa ? parseInt(hoa.replace(/\D/g, '') || '0', 10).toLocaleString('en-US') : ''}
              onChange={e => setHoa(e.target.value.replace(/\D/g, ''))}
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

        {/* Property type */}
        <div>
          <label style={labelStyle}>Property type</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PROPERTY_TYPE_OPTIONS.map(v => (
              <Chip key={v} label={v} active={propertyType === v}
                onClick={() => setPropertyType(propertyType === v ? '' : v)} />
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
          <div style={{ display: 'flex', gap: 6 }}>
            <Chip label="Yes" active={basement === true}  onClick={() => setBasement(true)}  />
            <Chip label="No"  active={basement === false} onClick={() => setBasement(false)} />
          </div>
        </div>

        {/* Sqft */}
        <div>
          <label style={labelStyle}>
            Sq ft <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            style={inputStyle}
            type="text"
            inputMode="numeric"
            placeholder="1,800"
            value={sqft}
            onChange={e => setSqft(e.target.value)}
          />
        </div>

        {/* Must-haves checklist */}
        {hasMustHaves && (
          <div>
            <label style={labelStyle}>Which of these are present?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {prefs!.must_haves!.map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={mustHavesPresent.includes(item)}
                    onChange={e => {
                      if (e.target.checked) {
                        setMustHavesPresent(prev => [...prev, item])
                      } else {
                        setMustHavesPresent(prev => prev.filter(m => m !== item))
                      }
                    }}
                    style={{ width: 18, height: 18, accentColor: 'var(--brand)' }}
                  />
                  <span style={{ color: 'var(--text1)' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Dealbreakers checklist */}
        {hasDealbreakers && (
          <div>
            <label style={labelStyle}>Do any of these apply?</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {prefs!.dealbreakers!.map(item => (
                <label key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox"
                    checked={dealbreakersPresent.includes(item)}
                    onChange={e => {
                      if (e.target.checked) {
                        setDealbrakersPresent(prev => [...prev, item])
                      } else {
                        setDealbrakersPresent(prev => prev.filter(d => d !== item))
                      }
                    }}
                    style={{ width: 18, height: 18, accentColor: 'var(--danger)' }}
                  />
                  <span style={{ color: 'var(--text1)' }}>{item}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Score button */}
        <button
          type="button"
          onClick={handleScore}
          style={{
            padding: '14px 16px', borderRadius: 8, border: 'none',
            background: 'var(--brand)', color: '#fff',
            fontSize: 15, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Score Property
        </button>

        {/* Score result */}
        {result && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px',
            display: 'flex', flexDirection: 'column', gap: 0,
          }}>
            {/* Overall badge */}
            <div style={{ marginBottom: 16 }}>
              <span style={{
                display: 'inline-block',
                padding: '5px 14px', borderRadius: 20,
                fontSize: 14, fontWeight: 700,
                background: overallConfig[result.overall].bg,
                color: overallConfig[result.overall].color,
              }}>
                {overallConfig[result.overall].label}
              </span>
            </div>

            {/* Dimension rows */}
            {result.dimensions.map((dim, i) => (
              <div key={dim.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                paddingTop: i === 0 ? 0 : 10,
                paddingBottom: i === result.dimensions.length - 1 ? 0 : 10,
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: dotColor[dim.status],
                  }} />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{dim.label}</span>
                </div>
                <span style={{
                  fontSize: 12, color: 'var(--text2)',
                  textAlign: 'right', marginLeft: 12, maxWidth: '55%',
                }}>
                  {dim.detail}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>

      <BottomNav />
    </div>
  )
}
