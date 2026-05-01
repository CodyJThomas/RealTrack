# RealTrack UX Standards
Established 2026-04-30. Apply to all new pages and components.

---

## Design Foundation

**Plus Jakarta Sans** is the RealTrack typeface. It anchors the entire design system — warm, geometric, humanist. Every spacing, color, and component decision should feel like it belongs next to it. When something looks off, ask whether it matches the energy of the font: modern but not cold, professional but not stiff, readable at any size.

Implementation: loaded via `next/font/google` in `layout.tsx`, CSS variable `--font-jakarta`, falls back to `system-ui`.

---

## Color Palette

Light mode surfaces use warm sandy off-white (not pure white) — avoids clinical brightness:
- `--surface`: `#F9F7F4` — base background, cards, nav
- `--surface2`: `#F3F1ED` — page background behind cards
- `--surface3`: `#EAE7E1` — chip backgrounds, disabled states, subtle fills
- `--border`: `rgba(0,0,0,0.08)` — all borders

Dark mode is unchanged (already warm).

---

## Typography Scale

Plus Jakarta Sans renders beautifully at all these sizes — lean into its geometric warmth by keeping weights clean (400, 500, 600, 700 only — avoid 300 or 800+). Note: Jakarta 700 reads noticeably heavier than system-ui 700 did; prefer 500–600 for UI elements that previously used bold, and reserve 700 for headings only.

| Role | Size | Weight | Color |
|---|---|---|---|
| Page/card heading | 17px | 700 | `--text1` |
| Section label | 11px | 700 uppercase | `--text3` |
| Body / list item | 13–14px | 400–500 | `--text1` |
| Subtitle / metadata | 12px | 400 | `--text2` |
| Micro / badges | 10–11px | 600–700 | varies |

Section labels use the shared `sectionLabel` export from `lib/utils.ts`.

---

## Status Badges

| Status | Background | Text color | When to use |
|---|---|---|---|
| Good | `#DCFCE7` | `--good` (#3B6D11) | Default — client in good standing |
| Flagged | `#FEF3C7` | `--warn` (#BA7517) | `flag_reason` set, or 5+ visits / 0 offers |
| Retainer | `#FEE2E2` | `--danger` (#A32D2D) | `retainer_required = true` |
| No Offers | `#FEF9C3` | `#854D0E` | visits >= 5 and offers === 0 |

Badges: `fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase'`

---

## Visit Progress Bar

- Width: `min(visitCount / 10 * 100, 100)%`
- Color thresholds: >6 visits → `--danger`, >3 visits → `--warn`, else `--brand`
- Legend: "Amber at 4+ visits · Red at 7+"
- Height: 8px, borderRadius: 4px, background: `--surface3`

---

## Cards

```
background: var(--surface)
border: 1px solid var(--border)
borderRadius: 12px
padding: 14px 16px
```

Cards stack inside a column with `gap: 20` and `padding: 16px 16px 0`.

---

## Client Cards (list view)

- Avatar: 40px circle, hash color via `avatarColor()`, initials via `initials()`, white text 13px weight 500 (not bold — Jakarta Sans 700 reads too heavy)
- Avatar palette: 8 curated brand-adjacent colors — no semantic warn/danger colors in the set. Colors: `#1B3060` navy, `#2563EB` blue, `#0F6E5C` deep teal, `#5B3FA6` violet, `#8B4513` warm brown, `#1A5276` steel, `#4A235A` plum, `#2E6B3E` forest
- Subtitle pattern: `{N} visit(s) · {N} offer(s) · $XK–$YK`
- One badge (priority: Retainer > Flagged > No Offers > Good)
- Row is fully pressable via `data-pressable` attribute
- Tap navigates to `/clients/[id]`

---

## Bottom Navigation

3 tabs: Dashboard, Clients, Settings.
- Inline SVG icons, `width/height: 22`, `viewBox="0 0 24 24"`, `stroke="currentColor"`
- Active: `strokeWidth: 2.2`, color `var(--brand)`, `fontWeight: 600`
- Inactive: `strokeWidth: 1.8`, color `var(--text3)`, `fontWeight: 400`
- Active detection: exact match for `/`, `startsWith` for all others
- Fixed at bottom with `env(safe-area-inset-bottom)` padding
- Height effectively 64px; page content uses `paddingBottom: 80`

---

## Tap Feedback

Global in `globals.css`:
```css
button:active { opacity: 0.65; }
a:active { opacity: 0.65; }
[data-pressable]:active { opacity: 0.65; }
```

Use `data-pressable` on any `<div>` or `<li>` that acts as a tap target.

---

## Toast Notifications

- Component: `<Toast message={...} onDismiss={() => setToast(null)} />`
- Auto-dismisses after 2500ms
- Position: `fixed, bottom: 74` (clears BottomNav), `zIndex: 200`
- Style: dark bg (`var(--text1)`), white text (`var(--surface)`), borderRadius: 10
- One toast at a time per page; set with `setToast('message')`

---

## Confirmation Pattern

Never use `window.confirm()`. Use inline state toggle:

```tsx
const [archiveConfirm, setArchiveConfirm] = useState(false)

{archiveConfirm ? (
  <div style={{ display: 'flex', gap: 8 }}>
    <button onClick={doAction}>Confirm</button>
    <button onClick={() => setArchiveConfirm(false)}>Cancel</button>
  </div>
) : (
  <button onClick={() => setArchiveConfirm(true)}>Archive client</button>
)}
```

---

## Forms / Bottom Sheets

- Add/edit flows slide up from the bottom (`position: fixed, bottom: 0, left: 0, right: 0`)
- `borderRadius: '16px 16px 0 0'`, `padding: 20`, `paddingBottom: env(safe-area-inset-bottom)`
- Backdrop: `position: fixed, inset: 0, background: rgba(0,0,0,0.4), zIndex: 100`
- Sheet `zIndex: 101`
- Use shared `inputStyle` and `labelStyle` from `lib/utils.ts`
- Submit button: `background: var(--brand), color: #fff, borderRadius: 8, padding: 12px, fontSize: 15, fontWeight: 600`
- Cancel: `background: none, border: none, color: var(--text2)`

---

## Loading States

"Loading..." text is acceptable. No skeleton screens required for v1.

```tsx
if (loading) return (
  <div style={{ paddingBottom: 80 }}>
    <p style={{ padding: 24, color: 'var(--text2)' }}>Loading...</p>
    <BottomNav />
  </div>
)
```

---

## Shared Style Exports (`lib/utils.ts`)

- `sectionLabel` — section heading CSSProperties
- `inputStyle` — form input CSSProperties
- `labelStyle` — form label CSSProperties

Always import from utils rather than redefining inline.

---

## Competitive Context

ShowingTime (Zillow-owned, ~50k agents) is Cory's current tool. It handles scheduling, not relationship intelligence. Our wedge: RealTrack tracks visit-to-offer ratio, flags time-wasting clients, and surfaces retainer risk. When writing copy, position around relationship intelligence — not another scheduling tool.
