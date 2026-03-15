import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'
import { getWelcomeEmail } from '@/lib/email/welcome-template'

export async function POST(request: Request) {
  try {
    const { cleanerId } = await request.json()

    if (!cleanerId) {
      return NextResponse.json({ error: 'cleanerId is required' }, { status: 400 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const resendKey = process.env.RESEND_API_KEY

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
    }
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Get cleaner info
    const { data: cleaner, error: fetchError } = await supabase
      .from('users')
      .select('name, email, language')
      .eq('id', cleanerId)
      .eq('role', 'cleaner')
      .single()

    if (fetchError || !cleaner) {
      return NextResponse.json({ error: 'Cleaner not found' }, { status: 404 })
    }

    // Generate a password recovery link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: cleaner.email,
      options: {
        redirectTo: `${appUrl}/auth/callback?type=recovery`,
      },
    })

    if (linkError || !linkData) {
      return NextResponse.json({ error: linkError?.message || 'Failed to generate link' }, { status: 500 })
    }

    // Build the email
    const { html, subject } = getWelcomeEmail(
      cleaner.name,
      linkData.properties.action_link,
      cleaner.language || 'nl'
    )

    // Send via Resend
    const resend = new Resend(resendKey)
    const { error: sendError } = await resend.emails.send({
      from: 'Clean Del Sol <noreply@cleandelsol.com>',
      to: cleaner.email,
      subject,
      html,
    })

    if (sendError) {
      return NextResponse.json({ error: sendError.message }, { status: 500 })
    }

    // Mark as sent
    await supabase
      .from('users')
      .update({ welcome_email_sent: true })
      .eq('id', cleanerId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
