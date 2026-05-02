'use client'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

const HIDDEN_ON = ['/login']

export default function TopBar() {
  const pathname = usePathname()
  if (HIDDEN_ON.includes(pathname)) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      height: 36,
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      padding: '0 16px',
    }}>
      <Image src="/rt-mark.png" alt="RealTrack" width={24} height={24} style={{ objectFit: 'contain' }} />
    </div>
  )
}
