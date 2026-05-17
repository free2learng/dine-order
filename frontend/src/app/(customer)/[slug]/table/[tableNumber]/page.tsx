import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CustomerApp } from '@/components/customer/customer-app'
interface Props { params: Promise<{ slug: string; tableNumber: string }> }
export default async function TablePage({ params }: Props) {
  const { slug, tableNumber } = await params
  const supabase = await createClient()
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('slug', slug).eq('active', true).single()
  if (!restaurant) notFound()
  const { data: table } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', restaurant.id).eq('table_number', tableNumber).single()
  if (!table) notFound()
  const { data: categories } = await supabase.from('categories').select('*').eq('restaurant_id', restaurant.id).order('display_order')
  const { data: menuItems } = await supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).eq('available', true).order('name')
  return <CustomerApp restaurant={restaurant} table={table} categories={categories ?? []} menuItems={menuItems ?? []} />
}
