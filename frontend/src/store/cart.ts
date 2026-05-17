import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartItem, MenuItem } from '@/types'
interface CartStore {
  items: CartItem[]; restaurantId: number | null; tableNumber: string | null
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void
  removeItem: (menuItemId: number) => void
  updateQuantity: (menuItemId: number, quantity: number) => void
  clearCart: () => void
  setTable: (restaurantId: number, tableNumber: string) => void
  total: () => number
  itemCount: () => number
}
export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [], restaurantId: null, tableNumber: null,
      addItem: (menuItem, quantity = 1, notes) => {
        set((state) => {
          const existing = state.items.find(i => i.menuItem.id === menuItem.id)
          if (existing) return { items: state.items.map(i => i.menuItem.id === menuItem.id ? { ...i, quantity: i.quantity + quantity } : i) }
          return { items: [...state.items, { menuItem, quantity, notes }] }
        })
      },
      removeItem: (menuItemId) => set((state) => ({ items: state.items.filter(i => i.menuItem.id !== menuItemId) })),
      updateQuantity: (menuItemId, quantity) => {
        if (quantity <= 0) { get().removeItem(menuItemId); return }
        set((state) => ({ items: state.items.map(i => i.menuItem.id === menuItemId ? { ...i, quantity } : i) }))
      },
      clearCart: () => set({ items: [], restaurantId: null, tableNumber: null }),
      setTable: (restaurantId, tableNumber) => set({ restaurantId, tableNumber }),
      total: () => get().items.reduce((sum, i) => sum + i.menuItem.price * i.quantity, 0),
      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'dineorder-cart' }
  )
)
