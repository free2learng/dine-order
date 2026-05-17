export interface Restaurant {
  id: number; name: string; slug: string; logo_url: string | null
  theme_color: string; address: string | null; phone: string | null
  email: string | null; currency: string; active: boolean; created_at: string
}
export interface Category {
  id: number; restaurant_id: number; name: string
  description: string | null; display_order: number
}
export interface MenuItem {
  id: number; restaurant_id: number; category_id: number; name: string
  description: string | null; price: number; image_url: string | null
  available: boolean; allergens: string | null; calories: number | null
}
export interface RestaurantTable {
  id: number; restaurant_id: number; table_number: string
  capacity: number; location: string | null
  status: 'available' | 'occupied' | 'reserved' | 'cleaning'
}
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export interface Order {
  id: number; restaurant_id: number; table_id: number; status: OrderStatus
  total: number; customer_name: string | null; notes: string | null
  created_at: string; updated_at: string
  table?: RestaurantTable; items?: OrderItem[]
}
export interface OrderItem {
  id: number; order_id: number; menu_item_id: number; quantity: number
  unit_price: number; subtotal: number; notes: string | null; menu_item?: MenuItem
}
export interface CartItem { menuItem: MenuItem; quantity: number; notes?: string }
export interface StaffMember {
  id: number; restaurant_id: number; user_id: string; name: string
  role: 'owner' | 'manager' | 'staff' | 'kitchen'; active: boolean
}
