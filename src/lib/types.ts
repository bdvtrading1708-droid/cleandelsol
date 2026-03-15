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
  welcome_email_sent?: boolean
}

export interface Partner {
  id: string
  name: string
  phone?: string
  email?: string
  notes?: string
  avatar_url?: string
  address?: string
  city?: string
  postal_code?: string
  country?: string
  tax_number?: string
}

export interface Invoice {
  id: number
  invoice_number: string
  partner_id: string
  created_at: string
  total_amount: number
  pdf_url?: string
  status: 'sent' | 'paid'
  partner?: Partner
  jobs?: Job[]
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

export type JobStatus = 'planned' | 'progress' | 'delivered' | 'invoiced' | 'done'

export interface JobCleaner {
  id: number
  job_id: string
  cleaner_id: string
  cleaner_payout?: number
  start_time?: string
  end_time?: string
  hours_worked?: number
  km_driven?: number
  extra_costs?: number
  cleaner?: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'avatar_url'>
}

export interface Job {
  id: number
  property_id?: string
  custom_property_name?: string
  pricing_type?: 'hourly' | 'fixed'
  date: string
  start_time?: string
  end_time?: string
  client_price?: number
  status: JobStatus
  paid_at?: string
  extra_costs?: number
  laundry_cost?: number
  payment_method?: 'cash' | 'bank'
  notes?: string
  property?: Property
  cleaners: JobCleaner[]
  photos?: JobPhoto[]
  // Legacy fields - kept for backward compatibility during migration
  cleaner_id?: string
  cleaner_payout?: number
  km_driven?: number
  hours_worked?: number
  cleaner?: Pick<User, 'id' | 'name' | 'email' | 'phone' | 'avatar_url'>
}

export interface JobPhoto {
  id: number
  job_id: string
  url: string
}
