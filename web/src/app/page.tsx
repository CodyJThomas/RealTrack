'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import type { Client } from '@/lib/types'

const V2_BANNER_KEY = 'rt_v2_banner_dismissed'

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([])
  const [showBanner, setShowBanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!localStorage.getItem(V2_BANNER_KEY)) setShowBanner(true)
      const { data } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
      setClients(data ?? [])
      setLoading(false)
    }
    init()
  }, [])

  function budgetLabel(c: Client) {
    if (c.budget_min && c.budget_max)
      return `$${(c.budget_min / 1000).toFixed(0)}K–$${(c.budget_max / 1000).toFixed(0)}K`
    return null
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {showBanner && (
        <div style={{
          background: 'var(--brand-light)', borderBottom: '1px solid var(--border)',
          padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span style={{ fontSize: 13, color: 'var(--brand)', fontWeight: 500 }}>
            Welcome to RealTrack v2 — client intelligence upgraded.
          </span>
          <button onClick={() => { localStorage.setItem(V2_BANNER_KEY, '1'); setShowBanner(false) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 18 }}>×</button>
        </div>
      )}
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Dashboard</h1>
      </div>
      {loading ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
      ) : clients.length === 0 ? (
        <p style={{ padding: 24, color: 'var(--text2)' }}>No clients yet.</p>
      ) : (
        <div>
          {clients.filter(c => !c.archived_at).map(c => (
            <div key={c.id} data-pressable onClick={() => router.push(`/clients/${c.id}`)} style={{
              padding: '14px 16px', borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer',
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{c.full_name}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{c.phone ?? c.email}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
                {budgetLabel(c) && (
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)' }}>{budgetLabel(c)}</span>
                )}
                {c.flag_reason && (
                  <span style={{ fontSize: 10, color: 'var(--warn)', fontWeight: 600 }}>⚑ flagged</span>
                )}
                {c.retainer_required && (
                  <span style={{ fontSize: 10, color: 'var(--text3)' }}>retainer req.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <BottomNav />
    </div>
  )
}
