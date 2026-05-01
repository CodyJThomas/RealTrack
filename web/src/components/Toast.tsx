'use client'
import { useEffect } from 'react'

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2500)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div style={{
      position: 'fixed',
      bottom: 74,
      left: 16, right: 16,
      background: 'var(--text1)',
      color: 'var(--surface)',
      padding: '12px 16px',
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      zIndex: 200,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      textAlign: 'center',
    }}>
      {message}
    </div>
  )
}
