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

// ── Property Scoring Engine ────────────────────────────────────────────────

export type PropertyInput = {
  address: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  garage: 'none' | 'detached' | 'attached' | null
  basement: boolean
  property_type: string | null
  hoa: number | null
  mustHavesPresent: string[]
  dealbreakersPresent: string[]
}

export type DimensionScore = {
  label: string
  status: 'green' | 'amber' | 'red' | 'gray'
  detail: string
}

export type PropertyScore = {
  overall: 'strong' | 'good' | 'fair' | 'poor'
  dimensions: DimensionScore[]
  hardFailures: number
  softMisses: number
}

import type { ClientPreference } from './types'

export function scoreProperty(input: PropertyInput, prefs: ClientPreference): PropertyScore {
  const dimensions: DimensionScore[] = []

  // Price
  if (prefs.price_min == null && prefs.price_max == null) {
    dimensions.push({ label: 'Price', status: 'gray', detail: 'No budget set' })
  } else if (input.price == null) {
    dimensions.push({ label: 'Price', status: 'gray', detail: 'No price entered' })
  } else {
    const min = prefs.price_min
    const max = prefs.price_max
    if (min != null && input.price < min) {
      dimensions.push({ label: 'Price', status: 'red', detail: `$${input.price.toLocaleString()} is under minimum $${min.toLocaleString()}` })
    } else if (max != null && input.price > max * 1.1) {
      dimensions.push({ label: 'Price', status: 'red', detail: `$${input.price.toLocaleString()} is >10% over max $${max.toLocaleString()}` })
    } else if (max != null && input.price > max) {
      dimensions.push({ label: 'Price', status: 'amber', detail: `$${input.price.toLocaleString()} is slightly over max $${max.toLocaleString()}` })
    } else {
      dimensions.push({ label: 'Price', status: 'green', detail: `$${input.price.toLocaleString()} is within budget` })
    }
  }

  // Beds
  if (prefs.bedrooms_min == null) {
    dimensions.push({ label: 'Bedrooms', status: 'gray', detail: 'No preference set' })
  } else if (input.bedrooms == null) {
    dimensions.push({ label: 'Bedrooms', status: 'gray', detail: 'Not entered' })
  } else if (input.bedrooms >= prefs.bedrooms_min) {
    dimensions.push({ label: 'Bedrooms', status: 'green', detail: `${input.bedrooms} beds meets ${prefs.bedrooms_min}+ minimum` })
  } else {
    dimensions.push({ label: 'Bedrooms', status: 'red', detail: `${input.bedrooms} beds is under ${prefs.bedrooms_min}+ minimum` })
  }

  // Baths
  if (prefs.bathrooms_min == null) {
    dimensions.push({ label: 'Bathrooms', status: 'gray', detail: 'No preference set' })
  } else if (input.bathrooms == null) {
    dimensions.push({ label: 'Bathrooms', status: 'gray', detail: 'Not entered' })
  } else if (input.bathrooms >= prefs.bathrooms_min) {
    dimensions.push({ label: 'Bathrooms', status: 'green', detail: `${input.bathrooms} baths meets ${prefs.bathrooms_min}+ minimum` })
  } else {
    dimensions.push({ label: 'Bathrooms', status: 'red', detail: `${input.bathrooms} baths is under ${prefs.bathrooms_min}+ minimum` })
  }

  // Sqft
  if (prefs.sqft_min == null) {
    dimensions.push({ label: 'Square footage', status: 'gray', detail: 'No preference set' })
  } else if (input.sqft == null) {
    dimensions.push({ label: 'Square footage', status: 'gray', detail: 'Not entered' })
  } else if (input.sqft >= prefs.sqft_min) {
    dimensions.push({ label: 'Square footage', status: 'green', detail: `${input.sqft.toLocaleString()} sqft meets ${prefs.sqft_min.toLocaleString()}+ minimum` })
  } else {
    dimensions.push({ label: 'Square footage', status: 'red', detail: `${input.sqft.toLocaleString()} sqft is under ${prefs.sqft_min.toLocaleString()}+ minimum` })
  }

  // Property type
  if (!prefs.property_types || prefs.property_types.length === 0) {
    dimensions.push({ label: 'Property type', status: 'gray', detail: 'No preference set' })
  } else if (!input.property_type) {
    dimensions.push({ label: 'Property type', status: 'gray', detail: 'Not entered' })
  } else if (prefs.property_types.map(t => t.toLowerCase()).includes(input.property_type.toLowerCase())) {
    dimensions.push({ label: 'Property type', status: 'green', detail: `${input.property_type} matches preference` })
  } else {
    dimensions.push({ label: 'Property type', status: 'amber', detail: `${input.property_type} not in preferred types` })
  }

  // Garage
  if (!prefs.garage_preference || prefs.garage_preference === 'any') {
    dimensions.push({ label: 'Garage', status: 'gray', detail: 'No preference set' })
  } else if (input.garage == null) {
    dimensions.push({ label: 'Garage', status: 'gray', detail: 'Not entered' })
  } else if (input.garage === prefs.garage_preference) {
    dimensions.push({ label: 'Garage', status: 'green', detail: `${input.garage} garage matches preference` })
  } else {
    dimensions.push({ label: 'Garage', status: 'amber', detail: `${input.garage} garage vs preferred ${prefs.garage_preference}` })
  }

  // Basement
  if (!prefs.basement_preference || prefs.basement_preference === 'not_needed') {
    dimensions.push({ label: 'Basement', status: 'gray', detail: 'No preference set' })
  } else if (prefs.basement_preference === 'required' && !input.basement) {
    dimensions.push({ label: 'Basement', status: 'red', detail: 'Basement required but not present' })
  } else if (prefs.basement_preference === 'preferred' && !input.basement) {
    dimensions.push({ label: 'Basement', status: 'amber', detail: 'Basement preferred but not present' })
  } else {
    dimensions.push({ label: 'Basement', status: 'green', detail: input.basement ? 'Has basement' : 'No basement needed' })
  }

  // HOA
  if (prefs.max_hoa == null) {
    dimensions.push({ label: 'HOA', status: 'gray', detail: 'No preference set' })
  } else if (input.hoa == null) {
    dimensions.push({ label: 'HOA', status: 'gray', detail: 'Not entered' })
  } else if (input.hoa <= prefs.max_hoa) {
    dimensions.push({ label: 'HOA', status: 'green', detail: `$${input.hoa}/mo is within $${prefs.max_hoa}/mo max` })
  } else {
    dimensions.push({ label: 'HOA', status: 'red', detail: `$${input.hoa}/mo exceeds $${prefs.max_hoa}/mo max` })
  }

  // Dealbreakers
  if (input.dealbreakersPresent.length > 0) {
    dimensions.push({ label: 'Dealbreakers', status: 'red', detail: input.dealbreakersPresent.join(', ') })
  } else if (prefs.dealbreakers && prefs.dealbreakers.length > 0) {
    dimensions.push({ label: 'Dealbreakers', status: 'green', detail: 'None present' })
  } else {
    dimensions.push({ label: 'Dealbreakers', status: 'gray', detail: 'None set' })
  }

  // Must-haves
  if (!prefs.must_haves || prefs.must_haves.length === 0) {
    dimensions.push({ label: 'Must-haves', status: 'gray', detail: 'None set' })
  } else if (input.mustHavesPresent.length === prefs.must_haves.length) {
    dimensions.push({ label: 'Must-haves', status: 'green', detail: 'All present' })
  } else if (input.mustHavesPresent.length > 0) {
    const missing = prefs.must_haves.filter(m => !input.mustHavesPresent.includes(m))
    dimensions.push({ label: 'Must-haves', status: 'amber', detail: `Missing: ${missing.join(', ')}` })
  } else {
    dimensions.push({ label: 'Must-haves', status: 'red', detail: 'None present' })
  }

  // Tally failures and misses
  const hardFailureLabels = new Set(['Bedrooms', 'Bathrooms', 'Dealbreakers'])
  const basementRequiredRed = prefs.basement_preference === 'required' && !input.basement

  let hardFailures = 0
  let softMisses = 0

  for (const dim of dimensions) {
    if (dim.status === 'red') {
      if (hardFailureLabels.has(dim.label) || (dim.label === 'Basement' && basementRequiredRed)) {
        hardFailures++
      } else {
        softMisses++
      }
    } else if (dim.status === 'amber') {
      softMisses++
    }
  }

  // Also count must-haves red as hard failure
  const mustHavesDim = dimensions.find(d => d.label === 'Must-haves')
  if (mustHavesDim?.status === 'red') {
    hardFailures++
    softMisses-- // was counted above as soft, correct it
  }

  let overall: 'strong' | 'good' | 'fair' | 'poor'
  if (hardFailures >= 2) {
    overall = 'poor'
  } else if (hardFailures === 1) {
    overall = 'fair'
  } else if (softMisses > 2) {
    overall = 'fair'
  } else if (softMisses >= 1) {
    overall = 'good'
  } else {
    overall = 'strong'
  }

  return { overall, dimensions, hardFailures, softMisses }
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
