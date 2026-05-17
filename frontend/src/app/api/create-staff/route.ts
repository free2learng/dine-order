import { NextRequest, NextResponse } from 'next/server'

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
  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key not configured' }, { status: 500 })
  }
  try {
    const authRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, email_confirm: true }),
    })
    const authJson = await authRes.json()
    if (!authRes.ok) {
      return NextResponse.json({ error: authJson.msg ?? authJson.message ?? authJson.error_description ?? authJson.error ?? JSON.stringify(authJson) }, { status: authRes.status })
    }
    const userId: string = authJson.id
    const { createClient } = await import('@supabase/supabase-js')
    const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error: staffError } = await admin.from('staff_members').insert({
      restaurant_id, user_id: userId, name, role, active: true,
    })
    if (staffError) {
      await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
      })
      return NextResponse.json({ error: staffError.message }, { status: 400 })
    }
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Server error' }, { status: 500 })
  }
}
