'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const DashboardIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

const ClientsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="3" />
    <path d="M3 21v-1a6 6 0 0 1 6-6h0" />
    <circle cx="17" cy="10" r="2.5" />
    <path d="M13 21v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" />
  </svg>
)

const AgentsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
    <line x1="12" y1="12" x2="12" y2="16" />
    <line x1="10" y1="14" x2="14" y2="14" />
  </svg>
)

const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)

const tabs = [
  { href: '/',         label: 'Dashboard', Icon: DashboardIcon },
  { href: '/clients',  label: 'Clients',   Icon: ClientsIcon   },
  { href: '/agents',   label: 'Agents',    Icon: AgentsIcon    },
  { href: '/settings', label: 'Settings',  Icon: SettingsIcon  },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      display: 'flex', borderTop: '1px solid var(--border)',
      background: 'var(--surface)', paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || (href !== '/' && pathname.startsWith(href))
        return (
          <Link key={href} href={href} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '10px 0 8px', fontSize: 10, gap: 3,
            color: active ? 'var(--brand)' : 'var(--text3)',
            fontWeight: active ? 600 : 400,
            textDecoration: 'none',
          }}>
            <Icon active={active} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
