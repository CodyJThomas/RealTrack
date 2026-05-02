'use client'
import { useState } from 'react'

export default function InfoSheet({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Page info"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text3)', padding: '2px 4px', lineHeight: 1,
          fontSize: 16, display: 'flex', alignItems: 'center',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="8" strokeWidth="2.5" />
          <line x1="12" y1="12" x2="12" y2="16" />
        </svg>
      </button>

      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.4)',
            }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 101,
            background: 'var(--surface)',
            borderRadius: '16px 16px 0 0',
            padding: '20px 20px 40px',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
          }}>
            <div style={{
              width: 36, height: 4, borderRadius: 2,
              background: 'var(--border)', margin: '0 auto 18px',
            }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{title}</div>
            <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6, margin: 0 }}>{body}</p>
          </div>
        </>
      )}
    </>
  )
}
