'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import { initials, avatarColor, sectionLabel } from '@/lib/utils'

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

export default function AgentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [agent,   setAgent]   = useState<Agent | null>(null)
  const [deals,   setDeals]   = useState<LinkedDeal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: agentData } = await supabase
      .from('agents').select('*').eq('id', id).single()
    if (!agentData) { router.push('/agents'); return }
    setAgent(agentData as Agent)

    const { data: dealData } = await supabase
      .from('deals')
      .select('id, address, stage, representation, client_id')
      .eq('agent_id', id)
      .order('created_at', { ascending: false })

    if (dealData && dealData.length > 0) {
      const clientIds = [...new Set(dealData.map((d: { client_id: string }) => d.client_id))]
      const { data: clientData } = await supabase
        .from('clients').select('id, full_name').in('id', clientIds)

      const clientMap: Record<string, string> = {}
      for (const c of (clientData ?? []) as { id: string; full_name: string }[]) {
        clientMap[c.id] = c.full_name
      }

      setDeals(dealData.map((d: { id: string; address: string; stage: string | null; representation: 'buyer' | 'seller'; client_id: string }) => ({
        id: d.id,
        address: d.address,
        stage: d.stage,
        representation: d.representation,
        client_id: d.client_id,
        client_name: clientMap[d.client_id] ?? 'Unknown',
      })))
    } else {
      setDeals([])
    }

    setLoading(false)
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
        <button
          onClick={() => router.push('/agents')}
          style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0' }}
        >
          ←
        </button>
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
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            {agent.brokerage ?? 'Independent'}
          </div>
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '2px 7px',
          borderRadius: 10, textTransform: 'uppercase',
          ...categoryStyle[agent.category],
        }}>
          {agent.category}
        </span>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Rating + contact */}
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
              <div
                key={d.id}
                data-pressable
                onClick={() => router.push(`/clients/${d.client_id}`)}
                style={{
                  paddingTop: 10, paddingBottom: 10,
                  borderTop: i === 0 ? '1px solid var(--border)' : 'none',
                  cursor: 'pointer',
                }}
              >
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

      </div>

      <BottomNav />
    </div>
  )
}
