import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StaffDashboard } from '@/components/staff/staff-dashboard'
export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: staff } = await supabase.from('staff_members').select('*, restaurants(*)').eq('user_id', user.id).eq('active', true).single()
  if (!staff) redirect('/login')
  const restaurant = staff.restaurants as any
  const { data: orders } = await supabase.from('orders').select('*, restaurant_tables(table_number, location), order_items(*, menu_items(name))').eq('restaurant_id', restaurant.id).not('status', 'in', '("delivered","cancelled")').order('created_at', { ascending: true })
  return <StaffDashboard staff={staff} restaurant={restaurant} initialOrders={orders ?? []} />
}
