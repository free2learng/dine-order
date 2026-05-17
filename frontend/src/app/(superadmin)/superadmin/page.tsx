import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SuperAdminDashboard } from '@/components/superadmin/superadmin-dashboard'
export default async function SuperAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: superAdmin } = await supabase.from('super_admins').select('*').eq('user_id', user.id).single()
  if (!superAdmin) redirect('/login')
  const { data: restaurants } = await supabase.from('restaurants').select('*, staff_members(count), orders(count)').order('created_at', { ascending: false })
  return <SuperAdminDashboard superAdmin={superAdmin} restaurants={restaurants ?? []} />
}
