export type UserRole = 'admin' | 'cleaner'

export interface User {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  language?: string
  hourly_rate?: number
  payment_notes?: string
  avatar_url?: string
}

export interface Partner {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  avatar_url?: string
}

export interface Property {
  id: string
  name: string
  type: string
  address?: string
  maps_url?: string
  owner_name?: string
  default_price?: number
  notes?: string
  icon?: string
  bedrooms?: number
  bathrooms?: number
  terraces?: number
  pricing_type?: 'hourly' | 'fixed'
  fixed_price?: number
  image_url?: string
  partner_id?: string
  partner?: Partner
}

export type JobStatus = 'planned' | 'progress' | 'delivered' | 'done'

export interface Job {
  id: number
  property_id: string
  cleaner_id: string
  date: string
  start_time?: string
  end_time?: string
  client_price?: number
  cleaner_payout?: number
  status: JobStatus
  hours_worked?: number
  km_driven?: number
  extra_costs?: number
  payment_method?: 'cash' | 'bank'
  notes?: string
  property?: Property
  cleaner?: Pick<User, 'id' | 'name' | 'email' | 'phone'>
  photos?: JobPhoto[]
}

export interface JobPhoto {
  id: number
  job_id: number
  url: string
}
