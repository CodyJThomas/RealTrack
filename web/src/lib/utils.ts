export function initials(name: string): string {
  const words = name.split(' ').filter(w => w !== '&' && w.length > 0)
  const first = words[0]?.[0] ?? ''
  const last  = words[words.length - 1]?.[0] ?? ''
  return (first === last ? first : first + last).toUpperCase()
}

export function avatarColor(name: string): string {
  const COLORS = ['#1B3060', '#2563EB', '#0F6E5C', '#5B3FA6', '#8B4513', '#1A5276', '#4A235A', '#2E6B3E']
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return COLORS[hash % COLORS.length]
}

export function fmtBudget(min: number | null, max: number | null): string | null {
  if (!min && !max) return null
  if (min && max) return `$${(min / 1000).toFixed(0)}K–$${(max / 1000).toFixed(0)}K`
  if (min) return `$${(min / 1000).toFixed(0)}K+`
  return `up to $${(max! / 1000).toFixed(0)}K`
}

import type { CSSProperties } from 'react'

export const sectionLabel: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  color: 'var(--text3)',
  marginBottom: 8,
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--border)',
  fontSize: 15,
  background: 'var(--surface)',
  color: 'var(--text1)',
  outline: 'none',
}

export const labelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--text2)',
  marginBottom: 4,
  display: 'block' as const,
}
