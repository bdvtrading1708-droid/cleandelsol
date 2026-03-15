import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, phone, hourly_rate, payment_notes } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email required' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Service role key not configured. Add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Create auth user with a random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Insert into public.users table
    const { error: insertError } = await supabase.from('users').insert({
      id: authData.user.id,
      name,
      email,
      phone: phone || null,
      role: 'cleaner',
      hourly_rate: hourly_rate || null,
      payment_notes: payment_notes || null,
    })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: authData.user.id, password })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
