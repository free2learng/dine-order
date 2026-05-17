import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Optional guard: if INTERNAL_API_SECRET is configured, require matching header
  const secret = process.env.INTERNAL_API_SECRET
  if (secret && req.headers.get('x-internal-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { email?: string; password?: string; name?: string; role?: string; restaurant_id?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, password, name, role, restaurant_id } = body
  if (!email || !password || !name || !role || !restaurant_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  let supabase: ReturnType<typeof createAdminClient>
  try {
    supabase = createAdminClient()
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server misconfiguration' }, { status: 500 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  const { error: staffError } = await supabase.from('staff_members').insert({
    restaurant_id,
    user_id: authData.user.id,
    name,
    role,
    active: true,
  })

  if (staffError) {
    // Roll back the auth user so the email slot isn't permanently blocked
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: staffError.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
