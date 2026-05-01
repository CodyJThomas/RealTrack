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

type ExistingDeal = {
  id: string
  address: string
  stage: string
  agent_id: string | null
  representation: 'buyer' | 'seller'
}

type AgentInfo = { full_name: string; brokerage: string | null }
type LastOffer = { amount: number | null; direction: 'sent' | 'received'; status: string | null }

const STAGE_OPTIONS  = ['Active', 'Pending', 'Under Contract', 'Closed', 'Fallen Through']
const STATUS_OPTIONS = ['Pending', 'Accepted', 'Rejected', 'Countered', 'Withdrawn']

export default function LogOfferPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const today     = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const tomorrow  = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  const [clientName,     setClientName]     = useState('')
  const [existingDeals,  setExistingDeals]  = useState<ExistingDeal[]>([])
  const [selectedDealId, setSelectedDealId] = useState<string | 'new'>('new')

  // Context loaded when existing deal is selected
  const [agentInfo,         setAgentInfo]         = useState<AgentInfo | null>(null)
  const [lastOffer,         setLastOffer]         = useState<LastOffer | null>(null)
  const [dealStageWarning,  setDealStageWarning]  = useState(false)

  // New deal fields
  const [address,        setAddress]        = useState('')
  const [stage,          setStage]          = useState('Active')
  const [representation, setRepresentation] = useState<'buyer' | 'seller'>('buyer')

  // Offer fields
  const [amount,    setAmount]    = useState('')
  const [direction, setDirection] = useState<'sent' | 'received'>('sent')
  const [status,    setStatus]    = useState('Pending')
  const [offerDate, setOfferDate] = useState(today)
  const [notes,     setNotes]     = useState('')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const [{ data: client }, { data: deals }] = await Promise.all([
        supabase.from('clients').select('full_name').eq('id', id).single(),
        supabase.from('deals')
          .select('id, address, stage, agent_id, representation')
          .eq('client_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (client) setClientName(client.full_name)
      if (deals && deals.length > 0) {
        setExistingDeals(deals as ExistingDeal[])
        setSelectedDealId(deals[0].id)
      }
    }
    loadData()
  }, [id])

  // Load agent info + last offer whenever selected deal changes
  useEffect(() => {
    if (selectedDealId === 'new' || existingDeals.length === 0) {
      setAgentInfo(null)
      setLastOffer(null)
      setDealStageWarning(false)
      return
    }

    const deal = existingDeals.find(d => d.id === selectedDealId)
    if (!deal) return

    setDealStageWarning(['Closed', 'Fallen Through'].includes(deal.stage))

    async function loadDealContext() {
      const [agentResult, offerResult] = await Promise.all([
        deal!.agent_id
          ? supabase.from('agents').select('full_name, brokerage').eq('id', deal!.agent_id).single()
          : Promise.resolve({ data: null }),
        supabase.from('offers')
          .select('amount, direction, status')
          .eq('deal_id', selectedDealId)
          .order('offer_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      setAgentInfo((agentResult.data as AgentInfo | null) ?? null)

      const last = offerResult.data as LastOffer | null
      setLastOffer(last)
      if (last) {
        setDirection(last.direction === 'sent' ? 'received' : 'sent')
      }
    }

    loadDealContext()
  }, [selectedDealId, existingDeals])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || parseFloat(amount.replace(/,/g, '')) <= 0) {
      setError('Offer amount is required.')
      return
    }
    if (selectedDealId === 'new' && !address.trim()) {
      setError('Property address is required for a new deal.')
      return
    }
    setSaving(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    let dealId = selectedDealId === 'new' ? null : selectedDealId

    if (selectedDealId === 'new') {
      const { data: newDeal, error: dealError } = await supabase
        .from('deals')
        .insert({ user_id: user.id, client_id: id, address: address.trim(), stage, representation })
        .select('id')
        .single()
      if (dealError || !newDeal) {
        setError('Failed to create deal. Please try again.')
        setSaving(false)
        return
      }
      dealId = newDeal.id
    }

    const { error: offerError } = await supabase.from('offers').insert({
      deal_id:    dealId,
      offer_date: offerDate,
      amount:     parseFloat(amount.replace(/,/g, '')),
      direction,
      status,
      notes: notes.trim() || null,
    })

    if (offerError) {
      setError('Failed to save offer. Please try again.')
      setSaving(false)
      return
    }

    router.push(`/clients/${id}?offer=logged`)
  }

  const isNewDeal = selectedDealId === 'new'
  const selectedDeal = existingDeals.find(d => d.id === selectedDealId)

  function fmtAmount(n: number | null) {
    if (!n) return '—'
    return `$${n.toLocaleString()}`
  }

  function agentLabel() {
    if (!selectedDeal) return 'Agent'
    return selectedDeal.representation === 'seller' ? "Buyer's agent" : "Seller's agent"
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button
          onClick={() => router.push(`/clients/${id}`)}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0' }}
        >
          ←
        </button>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: 'var(--brand)' }}>Log Offer</h1>
          {clientName && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{clientName}</div>}
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Deal section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.5px' }}>
            Property
          </div>

          {/* Existing deal chips */}
          {existingDeals.length > 0 && (
            <div>
              <label style={labelStyle}>Deal</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {existingDeals.map(d => (
                  <Chip
                    key={d.id}
                    label={d.address}
                    active={selectedDealId === d.id}
                    onClick={() => setSelectedDealId(d.id)}
                  />
                ))}
                <Chip label="+ New property" active={selectedDealId === 'new'} onClick={() => setSelectedDealId('new')} />
              </div>
            </div>
          )}

          {/* Existing deal context panel */}
          {!isNewDeal && (agentInfo || lastOffer || dealStageWarning) && (
            <div style={{
              background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              {agentInfo && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--text3)', marginRight: 4 }}>{agentLabel()}:</span>
                  {agentInfo.full_name}{agentInfo.brokerage ? ` · ${agentInfo.brokerage}` : ''}
                </div>
              )}
              {lastOffer && (
                <div style={{ fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--text3)', marginRight: 4 }}>Last offer:</span>
                  {fmtAmount(lastOffer.amount)} {lastOffer.direction === 'sent' ? 'we sent' : 'we received'}
                  {lastOffer.status ? ` — ${lastOffer.status.toLowerCase()}` : ''}
                </div>
              )}
              {dealStageWarning && (
                <div style={{ fontSize: 12, color: 'var(--warn)', fontWeight: 500 }}>
                  This deal is {selectedDeal?.stage?.toLowerCase()} — confirm you want to add an offer.
                </div>
              )}
            </div>
          )}

          {/* New deal fields */}
          {isNewDeal && (
            <>
              <div>
                <label style={labelStyle}>
                  Address <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  style={inputStyle}
                  type="text"
                  placeholder="123 Main St, Columbus OH"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label style={labelStyle}>Representing</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <Chip label="Buyer" active={representation === 'buyer'} onClick={() => setRepresentation('buyer')} />
                  <Chip label="Seller" active={representation === 'seller'} onClick={() => setRepresentation('seller')} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Deal stage</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {STAGE_OPTIONS.map(s => (
                    <Chip key={s} label={s} active={stage === s} onClick={() => setStage(s)} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--border)' }} />

        {/* Offer section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text3)', letterSpacing: '0.5px' }}>
            Offer
          </div>

          {/* Amount */}
          <div>
            <label style={labelStyle}>
              Amount <span style={{ color: 'var(--danger)' }}>*</span>
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
                placeholder="425,000"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Direction */}
          <div>
            <label style={labelStyle}>Direction</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <Chip label="We sent"     active={direction === 'sent'}     onClick={() => setDirection('sent')}     />
              <Chip label="We received" active={direction === 'received'} onClick={() => setDirection('received')} />
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STATUS_OPTIONS.map(s => (
                <Chip key={s} label={s} active={status === s} onClick={() => setStatus(s)} />
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label style={labelStyle}>Offer date</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: offerDate !== today && offerDate !== yesterday && offerDate !== tomorrow ? 8 : 0 }}>
              <Chip label="Yesterday" active={offerDate === yesterday} onClick={() => setOfferDate(yesterday)} />
              <Chip label="Today"     active={offerDate === today}     onClick={() => setOfferDate(today)}     />
              <Chip label="Tomorrow"  active={offerDate === tomorrow}  onClick={() => setOfferDate(tomorrow)}  />
              <Chip
                label={offerDate !== today && offerDate !== yesterday && offerDate !== tomorrow
                  ? new Date(offerDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Pick date'}
                active={offerDate !== today && offerDate !== yesterday && offerDate !== tomorrow}
                onClick={() => (document.getElementById('offer-date-input') as HTMLInputElement | null)?.showPicker?.()}
              />
            </div>
            <input
              id="offer-date-input"
              style={{ ...inputStyle, display: offerDate !== today && offerDate !== yesterday && offerDate !== tomorrow ? 'block' : 'none' }}
              type="date"
              value={offerDate}
              onChange={e => setOfferDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div>
            <label style={labelStyle}>
              Notes <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, resize: 'vertical', minHeight: 72 }}
              placeholder="Counteroffer context, seller response, conditions…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--danger)', margin: 0 }}>{error}</p>}

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
          {saving ? 'Saving…' : 'Log Offer'}
        </button>

      </form>

      <BottomNav />
    </div>
  )
}
