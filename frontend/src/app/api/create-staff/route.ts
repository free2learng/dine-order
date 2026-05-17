import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, role, restaurant_id } = await req.json()

    if (!email || !password || !name || !role || !restaurant_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()

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
      // Roll back the auth user so the slot isn't blocked
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
