'use client'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import BottomNav from '@/components/BottomNav'

export default function LogVisitPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  return (
    <div style={{ paddingBottom: 80 }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <button
          onClick={() => router.push(`/clients/${id}`)}
          style={{
            background: 'none', border: 'none', fontSize: 22,
            cursor: 'pointer', color: 'var(--text2)', padding: '0 4px 0 0',
          }}
        >
          ←
        </button>
        <h1 style={{ fontSize: 17, fontWeight: 700 }}>Log Visit</h1>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '60px 24px', gap: 8, textAlign: 'center',
      }}>
        <span style={{ fontSize: 36 }}>🏠</span>
        <p style={{ fontWeight: 600, fontSize: 16 }}>Coming soon</p>
        <p style={{ fontSize: 14, color: 'var(--text2)' }}>Visit logging will be available in the next release.</p>
      </div>
      <BottomNav />
    </div>
  )
}
