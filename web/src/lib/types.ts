export type Client = {
  id: string
  user_id: string
  full_name: string
  email: string | null
  phone: string | null
  budget_min: number | null
  budget_max: number | null
  retainer_required: boolean
  flag_reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type Showing = {
  id: string
  client_id: string
  user_id: string
  address: string
  price: number | null
  bedrooms: number | null
  bathrooms: number | null
  shown_at: string
  notes: string | null
  created_at: string
}

export type ShowingReaction = {
  id: string
  showing_id: string
  client_id: string
  overall_reaction: 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no' | null
  price_reaction: string | null
  reaction_notes: string | null
  dealbreaker_reason: string | null
  created_at: string
}

export type ClientPreference = {
  id: string
  client_id: string
  price_min: number | null
  price_max: number | null
  bedrooms_min: number | null
  bathrooms_min: number | null
  target_neighborhoods: string[] | null
  must_haves: string[] | null
  dealbreakers: string[] | null
  style_notes: string | null
  created_at: string
  updated_at: string
}
