export type Signal = {
  level: 'green' | 'amber' | 'red'
  label: string
  detail: string
}

export type Insight = {
  level: 'amber' | 'red'
  action: string
  context: string
}

export function computeInsights(signals: Signal[]): Insight[] {
  const insights: Insight[] = []
  for (const sig of signals) {
    if (sig.level === 'green') continue
    const level = sig.level as 'amber' | 'red'
    switch (sig.label) {
      case 'Needs direction change':
        insights.push({ level, action: 'Revisit priorities', context: 'Recent reactions are consistently negative — reset the search criteria.' })
        break
      case 'Mixed signals':
        insights.push({ level, action: 'Check in on priorities', context: 'Reactions are mixed — a short conversation could unblock momentum.' })
        break
      case 'High visits, no offer yet':
        insights.push({ level, action: 'Have the offer conversation', context: sig.detail })
        break
      case 'High visit-to-offer ratio':
        insights.push({ level, action: 'Candid commitment check', context: sig.detail })
        break
      case 'Budget misalignment':
        insights.push({ level, action: 'Revisit the budget', context: sig.detail })
        break
      case 'Showing above stated budget':
        insights.push({ level, action: 'Have a budget conversation', context: sig.detail })
        break
      case 'ASAP timeline slipping':
        insights.push({ level, action: 'Reach out today', context: sig.detail })
        break
      case 'Falling behind timeline':
        insights.push({ level, action: 'Schedule a showing', context: sig.detail })
        break
      case 'Engagement fading':
        insights.push({ level, action: 'Schedule a showing', context: sig.detail })
        break
      case 'Stalled':
        insights.push({ level, action: 'Re-engage or close the loop', context: sig.detail })
        break
    }
  }
  return insights
}

// Simplified signal computation for the Dashboard — skips budget alignment (no per-showing prices).
// Covers visit ratio, timeline drift, engagement, and momentum.
export function computeDashboardSignals(
  visitCount: number,
  offerCount: number,
  lastShownDate: string | null,
  timeline: string | null,
  recentReactions: string[],   // reactions for last 3 showings, newest first
): Signal[] {
  const signals: Signal[] = []

  // Momentum — only if 3 reactions available
  if (recentReactions.length >= 3) {
    const last3 = recentReactions.slice(0, 3)
    const positives = last3.filter(r => r === 'yes' || r === 'strong_yes').length
    const negatives = last3.filter(r => r === 'no' || r === 'strong_no').length
    const detailStr = last3.map(r => r.replace('_', ' ')).join(' → ')
    if (positives >= 2) {
      signals.push({ level: 'green', label: 'Building toward offer', detail: `Last 3: ${detailStr}` })
    } else if (negatives >= 2) {
      signals.push({ level: 'red', label: 'Needs direction change', detail: `Last 3: ${detailStr}` })
    } else {
      signals.push({ level: 'amber', label: 'Mixed signals', detail: `Last 3: ${detailStr}` })
    }
  }

  // Visit ratio
  if (visitCount >= 4) {
    if (offerCount === 0 && visitCount < 7) {
      signals.push({ level: 'amber', label: 'High visits, no offer yet', detail: `${visitCount} showings, 0 offers` })
    } else if (offerCount === 0 && visitCount >= 7) {
      signals.push({ level: 'red', label: 'High visit-to-offer ratio', detail: `${visitCount} showings, 0 offers` })
    }
  }

  // Timeline drift
  if (timeline && lastShownDate) {
    const idle = Math.round((Date.now() - new Date(lastShownDate + 'T12:00:00').getTime()) / 86400000)
    if (timeline === 'asap' && idle > 14) {
      signals.push({ level: 'amber', label: 'ASAP timeline slipping', detail: `Last showing ${idle}d ago` })
    } else if (timeline === '1-3 months' && idle > 30) {
      signals.push({ level: 'amber', label: 'Falling behind timeline', detail: `Last showing ${idle}d ago` })
    }
  }

  // Engagement
  if (lastShownDate) {
    const idle = Math.round((Date.now() - new Date(lastShownDate + 'T12:00:00').getTime()) / 86400000)
    const idleLabel = idle === 0 ? 'today' : idle === 1 ? 'yesterday' : `${idle} days ago`
    if (idle >= 31 && idle <= 90) {
      signals.push({ level: 'amber', label: 'Engagement fading', detail: `Last showing ${idle}d ago` })
    } else if (idle > 90) {
      signals.push({ level: 'red', label: 'Stalled', detail: `Last showing ${idleLabel}` })
    }
  }

  return signals
}
