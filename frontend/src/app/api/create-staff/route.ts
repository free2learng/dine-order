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
  try {
    const supabase = createAdminClient()
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })
    const { error: staffError } = await supabase.from('staff_members').insert({
      restaurant_id, user_id: authData.user.id, name, role, active: true,
    })
    if (staffError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
