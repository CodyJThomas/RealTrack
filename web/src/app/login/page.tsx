'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` }
    })
    setSent(true)
  }

  async function handleDemo() {
    setDemoLoading(true)
    setDemoError(false)
    const { error } = await supabase.auth.signInWithPassword({
      email: 'demo@realtrack.app',
      password: 'realtrack-demo-2026',
    })
    if (error) {
      setDemoLoading(false)
      setDemoError(true)
      return
    }
    router.push('/')
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#1B3060', color: '#fff', padding: 24
    }}>
      <img src="/icon-192.png" alt="RealTrack" style={{ width: 96, height: 96, borderRadius: 20, marginBottom: 16, filter: 'invert(1) brightness(10)' }} />
      <p style={{ opacity: 0.8, marginBottom: 32, fontSize: 14 }}>Client intelligence for realtors</p>
      {sent ? (
        <p style={{ textAlign: 'center', opacity: 0.9 }}>Check your email for a login link.</p>
      ) : (
        <div style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              style={{ padding: '12px 16px', borderRadius: 8, border: 'none', fontSize: 16, outline: 'none' }}
            />
            <button type="submit" style={{
              padding: '12px 16px', borderRadius: 8,
              background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer'
            }}>
              Send login link
            </button>
          </form>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.3)' }} />
            <span style={{ fontSize: 12 }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.3)' }} />
          </div>
          {demoError && (
            <p style={{ fontSize: 13, color: '#fca5a5', textAlign: 'center', margin: 0 }}>
              Demo unavailable — try again.
            </p>
          )}
          <button onClick={handleDemo} disabled={demoLoading} style={{
            padding: '12px 16px', borderRadius: 8,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', fontSize: 16, fontWeight: 500, cursor: 'pointer', opacity: demoLoading ? 0.6 : 0.85
          }}>
            {demoLoading ? 'Loading…' : 'View Demo'}
          </button>
        </div>
      )}
    </div>
  )
}
