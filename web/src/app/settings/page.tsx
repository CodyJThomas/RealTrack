'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import InfoSheet from '@/components/InfoSheet'

export default function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? null)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Settings</h1>
        <InfoSheet
          title="Settings"
          body="Manage your account and brokerage profile. Your profile info appears on the dashboard and client-facing views. Contact support to change your brokerage or subscription plan."
        />
      </div>
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {email !== null && (
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>
            Signed in as {email}
          </p>
        )}
        <button onClick={handleLogout} style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'var(--surface3)', border: '1px solid var(--border)',
          color: 'var(--danger)', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left'
        }}>
          Log out
        </button>
      </div>
      <BottomNav />
    </div>
  )
}
