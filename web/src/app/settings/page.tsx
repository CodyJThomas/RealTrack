'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import BottomNav from '@/components/BottomNav'
import InfoSheet from '@/components/InfoSheet'
import { sectionLabel } from '@/lib/utils'

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What does the Dashboard show?',
    a: 'Your active clients grouped by engagement tier — Hot (active last 14 days), Warm (last 90 days), Stalled (needs attention), and New (no showings yet). Tiers update automatically based on showing activity.',
  },
  {
    q: 'How do I log a showing?',
    a: 'Open a client, tap "Log Visit," enter the property details, and capture a reaction. Reactions feed the Client Intelligence signals on the client detail page.',
  },
  {
    q: 'What are Client Intelligence signals?',
    a: 'Five automated read-outs: momentum (recent reaction trend), visit-to-offer ratio, budget alignment, timeline drift, and engagement recency. They update in real time — no manual input needed.',
  },
  {
    q: 'What does "flagged" mean?',
    a: 'A flag is raised when the system detects a concern — high visit count with no offer, budget misalignment, or stalled engagement. Check the client\'s intelligence signals for specifics.',
  },
  {
    q: 'How do I update a client\'s preferences?',
    a: 'Open the client, tap the edit icon to enter details, or navigate to Preferences for the full intake form. Preferences drive the budget alignment and timeline signals.',
  },
  {
    q: 'What is the Agents page for?',
    a: 'Tracking the listing agents on the other side of your showings. Log their name, brokerage, and contact info to build your network and quickly reference who was representing a property.',
  },
  {
    q: 'Is my data secure?',
    a: 'All data is stored in Supabase with row-level security. Only you and agents you explicitly add can access your clients and showings.',
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button
      onClick={() => setOpen(o => !o)}
      style={{
        display: 'block', width: '100%', textAlign: 'left',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 0', gap: 12,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text1)', lineHeight: 1.4 }}>{q}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 12px' }}>{a}</p>
      )}
    </button>
  )
}

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
    <div style={{ paddingBottom: 100 }}>
      <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Settings</h1>
        <InfoSheet
          title="Settings"
          body="Manage your account and brokerage profile. Your profile info appears on the dashboard and client-facing views. Contact support to change your brokerage or subscription plan."
        />
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Account */}
        <div>
          <div style={sectionLabel}>Account</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '4px 16px' }}>
            {email !== null && (
              <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text2)' }}>
                {email}
              </div>
            )}
            <button onClick={handleLogout} style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '12px 0', background: 'none', border: 'none',
              color: 'var(--danger)', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}>
              Log out
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div>
          <div style={sectionLabel}>FAQ</div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 16px' }}>
            {FAQ.map((item, i) => (
              <div key={i} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                <FaqItem q={item.q} a={item.a} />
              </div>
            ))}
          </div>
        </div>

      </div>
      <BottomNav />
    </div>
  )
}
