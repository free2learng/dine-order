import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { email, password, name, role, restaurant_id } = body
  if (!email || !password || !name || !role || !restaurant_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // Debug: confirm the key is present and looks like a service role key
  console.log('[create-staff] serviceKey prefix:', serviceKey?.slice(0, 20) ?? 'MISSING')

  try {
    // Use a direct fetch to the Supabase Auth Admin API so we control the
    // Authorization header explicitly — bypasses any SDK key-forwarding issues.
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey':        serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })

    const authJson = await authRes.json()

    if (!authRes.ok) {
      console.error('[create-staff] auth error:', authJson)
      return NextResponse.json({ error: authJson.message ?? authJson.error ?? 'Failed to create auth user' }, { status: authRes.status })
    }

    const userId: string = authJson.id
    if (!userId) {
      return NextResponse.json({ error: 'No user ID returned from auth' }, { status: 500 })
    }

    // Insert staff record using the admin client (bypasses RLS)
    const supabase = createAdminClient()
    const { error: staffError } = await supabase.from('staff_members').insert({
      restaurant_id,
      user_id: userId,
      name,
      role,
      active: true,
    })

    if (staffError) {
      // Roll back the auth user so the email slot isn't permanently blocked
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'apikey':        serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      })
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[create-staff] unexpected error:', err)
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
