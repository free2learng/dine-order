'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import {
  ShoppingCart, X, Plus, Minus, ChevronRight, ChevronLeft,
  Clock, CheckCircle2, ChefHat, Bell, UtensilsCrossed, ArrowRight,
} from 'lucide-react'
import type { Restaurant, Category, MenuItem, RestaurantTable, OrderStatus } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  restaurant: Restaurant
  table: RestaurantTable
  categories: Category[]
  menuItems: MenuItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const serif: React.CSSProperties = { fontFamily: 'var(--font-playfair, Georgia, serif)' }

const ORDER_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',   label: 'Order Received', icon: <Clock className="w-5 h-5" /> },
  { key: 'confirmed', label: 'Confirmed',       icon: <CheckCircle2 className="w-5 h-5" /> },
  { key: 'preparing', label: 'Preparing',       icon: <ChefHat className="w-5 h-5" /> },
  { key: 'ready',     label: 'Ready to Serve',  icon: <Bell className="w-5 h-5" /> },
  { key: 'delivered', label: 'Delivered',        icon: <UtensilsCrossed className="w-5 h-5" /> },
]

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07 } },
}

const sheet: Variants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { type: 'spring', damping: 32, stiffness: 320 } },
  exit:   { y: '100%', transition: { duration: 0.22, ease: 'easeIn' } },
}

const overlayVariant: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
  exit:   { opacity: 0 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const FOOD_IMAGES: Record<string, string> = {
  'calamari':   'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&h=300&fit=crop',
  'wings':      'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=400&h=300&fit=crop',
  'flatbread':  'https://images.unsplash.com/photo-1541745537411-b8046dc6d66c?w=400&h=300&fit=crop',
  'nachos':     'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400&h=300&fit=crop',
  'soup':       'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop',
  'salmon':     'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop',
  'chicken':    'https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&h=300&fit=crop',
  'pasta':      'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop',
  'brisket':    'https://images.unsplash.com/photo-1544025162-d76538961a07?w=400&h=300&fit=crop',
  'fish':       'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=400&h=300&fit=crop',
  'burger':     'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop',
  'bbq':        'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=400&h=300&fit=crop',
  'plant':      'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&h=300&fit=crop',
  'chips':      'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=300&fit=crop',
  'fries':      'https://images.unsplash.com/photo-1576107232684-1279f390859f?w=400&h=300&fit=crop',
  'slaw':       'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop',
  'onion':      'https://images.unsplash.com/photo-1639024471283-03518883512d?w=400&h=300&fit=crop',
  'corn':       'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&h=300&fit=crop',
  'toffee':     'https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=400&h=300&fit=crop',
  'brownie':    'https://images.unsplash.com/photo-1515037893149-de7f840978e2?w=400&h=300&fit=crop',
  'cheesecake': 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=300&fit=crop',
  'sorbet':     'https://images.unsplash.com/photo-1488900128323-21503983a07e?w=400&h=300&fit=crop',
  'cola':       'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400&h=300&fit=crop',
  'water':      'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400&h=300&fit=crop',
  'juice':      'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400&h=300&fit=crop',
  'lemonade':   'https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=400&h=300&fit=crop',
  'martini':    'https://images.unsplash.com/photo-1574096079513-d8259312b785?w=400&h=300&fit=crop',
  'spritz':     'https://images.unsplash.com/photo-1560508179-b2c9a3555772?w=400&h=300&fit=crop',
  'mojito':     'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400&h=300&fit=crop',
  'default':    'https://images.unsplash.com/photo-1565299507177-b0ac66763828?w=400&h=300&fit=crop',
}

const foodImg = (name: string, imageUrl?: string | null): string => {
  if (imageUrl) return imageUrl
  const lower = name.toLowerCase()
  const key = Object.keys(FOOD_IMAGES).find(k => lower.includes(k))
  return key ? FOOD_IMAGES[key] : FOOD_IMAGES['default']
}

const currencySymbol = (r: Restaurant) => (r.currency === 'EUR' ? '€' : (r.currency ?? '€'))

// ─── Main component ───────────────────────────────────────────────────────────
export function CustomerApp({ restaurant, table, categories, menuItems }: Props) {
  const [screen, setScreen]             = useState<'welcome' | 'menu' | 'tracking'>(() => {
    if (typeof window === 'undefined') return 'welcome'
    const saved = localStorage.getItem(`dineorder-${restaurant.id}-${table.id}-orderId`)
    return saved ? 'tracking' : 'welcome'
  })
  const [activeCat, setActiveCat]       = useState<number | null>(categories[0]?.id ?? null)
  const [selected, setSelected]         = useState<MenuItem | null>(null)
  const [cartOpen, setCartOpen]         = useState(false)
  const [qty, setQty]                   = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [orderNotes, setOrderNotes]     = useState('')
  const [placing, setPlacing]           = useState(false)
  const [orderId, setOrderId]           = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(`dineorder-${restaurant.id}-${table.id}-orderId`)
    return saved ? Number(saved) : null
  })
  const [orderStatus, setOrderStatus]   = useState<OrderStatus>(() => {
    if (typeof window === 'undefined') return 'pending'
    return (localStorage.getItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`) as OrderStatus) || 'pending'
  })
  const tabsRef = useRef<HTMLDivElement>(null)

  const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, setTable } = useCartStore()
  const supabase   = createClient()
  const sym        = currencySymbol(restaurant)
  const themeColor = restaurant.theme_color ?? '#c8a96e'

  // Category emoji mapping
  const getEmoji = (name: string) => {
    const k = name.toLowerCase()
    if (k.includes('starter') || k.includes('salad') || k.includes('appetizer')) return '🥗'
    if (k.includes('main'))       return '🍖'
    if (k.includes('burger'))     return '🍔'
    if (k.includes('pizza'))      return '🍕'
    if (k.includes('pasta'))      return '🍝'
    if (k.includes('seafood') || k.includes('fish')) return '🐟'
    if (k.includes('chicken'))    return '🍗'
    if (k.includes('beef') || k.includes('steak'))   return '🥩'
    if (k.includes('vegan'))      return '🌱'
    if (k.includes('vegetarian')) return '🥦'
    if (k.includes('dessert') || k.includes('sweet')) return '🍰'
    if (k.includes('soft') || k.includes('beverage') || k.includes('juice')) return '🥤'
    if (k.includes('cocktail'))   return '🍹'
    if (k.includes('wine'))       return '🍷'
    if (k.includes('beer'))       return '🍺'
    if (k.includes('side'))       return '🍟'
    if (k.includes('special'))    return '⭐'
    return '🍴'
  }

  // Realtime order tracking
  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`
      }, (payload) => {
        const newStatus = payload.new.status as OrderStatus
        setOrderStatus(newStatus)
        localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`, newStatus)
      })
      .subscribe()

    // Fallback polling every 8 seconds in case realtime fails
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .single()
      if (data) {
        setOrderStatus(data.status as OrderStatus)
        localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`, data.status)
      }
    }, 8000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [orderId])

  useEffect(() => { setTable(restaurant.id, table.table_number) }, [restaurant.id, table.table_number])

  // Scroll active category tab into view
  useEffect(() => {
    if (!tabsRef.current || activeCat === null) return
    const btn = tabsRef.current.querySelector(`[data-cat="${activeCat}"]`) as HTMLElement | null
    btn?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [activeCat])

  // ── Place order ─────────────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (items.length === 0) return
    setPlacing(true)
    try {
      const { data: order, error: oErr } = await supabase
        .from('orders')
        .insert({
          restaurant_id: restaurant.id,
          table_id: table.id,
          customer_name: customerName.trim() || null,
          notes: orderNotes.trim() || null,
          total: total(),
          status: 'pending',
        })
        .select()
        .single()
      if (oErr || !order) throw oErr

      const { error: iErr } = await supabase.from('order_items').insert(
        items.map(i => ({
          order_id: order.id,
          menu_item_id: i.menuItem.id,
          quantity: i.quantity,
          unit_price: i.menuItem.price,
          subtotal: i.menuItem.price * i.quantity,
          notes: i.notes ?? null,
        }))
      )
      if (iErr) throw iErr

      setOrderId(order.id)
      setOrderStatus('pending')
      localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderId`, String(order.id))
      localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`, 'pending')
      clearCart()
      setCartOpen(false)
      setScreen('tracking')
      toast.success('Order placed!')
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to place order')
    } finally {
      setPlacing(false)
    }
  }

  const visibleItems = activeCat ? menuItems.filter(i => i.category_id === activeCat) : menuItems
  const count = itemCount()

  // ═══════════════════════════════════════════════════════════════════════════
  // TRACKING SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'tracking') {
    const stepIdx = ORDER_STEPS.findIndex(s => s.key === orderStatus)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <motion.div className="w-full max-w-sm" initial="hidden" animate="show" variants={stagger}>
          {/* Logo */}
          <motion.div variants={fadeUp} className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 text-white text-2xl font-bold"
              style={{ background: themeColor }}>
              {restaurant.name[0]}
            </div>
            <h1 className="text-white text-xl font-semibold" style={serif}>{restaurant.name}</h1>
            <p className="text-slate-400 text-sm mt-1">Table {table.table_number}</p>
          </motion.div>

          {/* Order badge */}
          <motion.div variants={fadeUp}
            className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 mb-8 flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-xs">Order</p>
              <p className="text-white font-bold text-lg">#{orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-xs">Status</p>
              <p className="font-semibold text-sm capitalize" style={{ color: themeColor }}>{orderStatus}</p>
            </div>
          </motion.div>

          {/* Progress steps */}
          <motion.div variants={fadeUp} className="space-y-3 mb-10">
            {ORDER_STEPS.filter(s => s.key !== 'cancelled').map((step, i) => {
              const done    = i < stepIdx
              const current = i === stepIdx
              return (
                <motion.div key={step.key}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                    current ? 'bg-white/10 border border-white/20' : 'opacity-40'
                  }`}
                  animate={current ? { scale: [1, 1.02, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                    done ? 'bg-green-500 text-white' : 'bg-white/10 text-slate-400'
                  }`} style={current ? { background: themeColor, color: 'white' } : {}}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : step.icon}
                  </div>
                  <span className={`text-sm font-medium ${current ? 'text-white' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                  {current && (
                    <motion.div className="ml-auto flex gap-1">
                      {[0, 1, 2].map(d => (
                        <motion.span key={d} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: themeColor }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }} />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )
            })}
          </motion.div>

          {orderStatus === 'delivered' ? (
            <motion.button variants={fadeUp}
              onClick={() => { 
                setScreen('menu'); 
                setOrderId(null)
                localStorage.removeItem(`dineorder-${restaurant.id}-${table.id}-orderId`)
                localStorage.removeItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`)
              }}
              className="w-full py-3.5 rounded-2xl font-semibold text-white"
              style={{ background: themeColor }}>
              Order Again
            </motion.button>
          ) : (
            <motion.button variants={fadeUp}
              onClick={() => setScreen('menu')}
              className="w-full py-3 rounded-2xl font-medium text-slate-400 border border-white/10 hover:border-white/20 transition-colors text-sm">
              Back to Menu
            </motion.button>
          )}
        </motion.div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'welcome') {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60" />

        {/* Bottom gradient for legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.92))' }} />

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-end">
          <motion.div className="w-full max-w-[480px] mx-auto px-6 pb-12 pt-8 space-y-5"
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}>

            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur border border-white/20 w-fit">
              <span className="text-lg">{restaurant.name[0] ? '🍽️' : '🍴'}</span>
              <span className="text-white/80 text-xs font-medium uppercase tracking-wider">Now Serving</span>
            </div>

            <div>
              <h1 className="text-5xl font-bold text-white leading-tight" style={serif}>
                {restaurant.name}
              </h1>
              <p className="text-white/60 text-base mt-3">
                Table {table.table_number}{table.location ? ` · ${table.location}` : ''}
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setScreen('menu')}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl text-white font-semibold text-base shadow-2xl"
              style={{ background: themeColor }}>
              View Menu <ArrowRight className="w-5 h-5" />
            </motion.button>

            <p className="text-center text-white/30 text-xs">Powered by DineOrder</p>
          </motion.div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50 pb-28">

      {/* Sticky header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => setScreen('welcome')} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 text-base truncate" style={serif}>{restaurant.name}</h1>
            <p className="text-gray-400 text-xs">Table {table.table_number}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-medium text-sm"
            style={{ background: themeColor }}>
            <ShoppingCart className="w-4 h-4" />
            {count > 0 && (
              <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="font-bold">
                {count}
              </motion.span>
            )}
          </motion.button>
        </div>

        {/* Category tabs */}
        {categories.length > 0 && (
          <div ref={tabsRef} className="flex gap-2 px-4 pb-3 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}>
            <button
              data-cat="all"
              onClick={() => setActiveCat(null)}
              className={`flex-none px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                activeCat === null ? 'text-white' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
              }`}
              style={activeCat === null ? { background: themeColor } : {}}>
              🍽️ All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                data-cat={cat.id}
                onClick={() => setActiveCat(cat.id)}
                className={`flex-none px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  activeCat === cat.id ? 'text-white' : 'text-gray-500 bg-gray-100 hover:bg-gray-200'
                }`}
                style={activeCat === cat.id ? { background: themeColor } : {}}>
                {getEmoji(cat.name)} {cat.name}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu list */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <AnimatePresence mode="wait">
          <motion.div key={activeCat ?? 'all'} className="flex flex-col gap-3"
            initial="hidden" animate="show" variants={stagger}>
            {visibleItems.map(item => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                className="relative">
                <button
                  onClick={() => { setSelected(item); setQty(1) }}
                  className="w-full text-left flex flex-row items-start gap-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                  style={{ padding: '12px' }}
                  disabled={!item.available}>
                  {/* Text side */}
                  <div className="flex-1 min-w-0 pr-3 flex flex-col">
                    <p className="font-semibold text-base text-gray-900 leading-snug">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                    {item.allergens && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ {item.allergens}</p>
                    )}
                    <p className="font-bold text-base mt-2" style={{ color: themeColor }}>
                      {sym}{Number(item.price).toFixed(2)}
                    </p>
                    {!item.available && (
                      <span className="text-xs font-medium text-red-500 mt-1">Unavailable</span>
                    )}
                  </div>
                  {/* Image side */}
                  <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foodImg(item.name, item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </button>
                {/* Plus button — absolute bottom-right of card */}
                {item.available && (
                  <button
                    onClick={() => { setSelected(item); setQty(1) }}
                    className="absolute bottom-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white shadow-md"
                    style={{ background: themeColor }}>
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
            {visibleItems.length === 0 && (
              <motion.div variants={fadeUp} className="py-16 text-center">
                <p className="text-gray-400 text-sm">Nothing here yet</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Sticky cart bar */}
      <AnimatePresence>
        {count > 0 && !cartOpen && (
          <div className="fixed bottom-0 left-0 right-0 flex justify-center z-20 pb-5 px-4 pointer-events-none">
            <motion.button
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 260 } }}
              exit={{ y: 80, opacity: 0, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCartOpen(true)}
              className="pointer-events-auto w-full max-w-[440px] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl text-white font-semibold"
              style={{ background: themeColor }}>
              <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{count}</span>
              <span className="flex-1 text-left">View Cart</span>
              <span>{sym}{total().toFixed(2)}</span>
              <ChevronRight className="w-5 h-5 opacity-70" />
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      {/* ═══ ITEM DETAIL MODAL ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="item-overlay"
              variants={overlayVariant} initial="hidden" animate="show" exit="exit"
              className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
              onClick={() => setSelected(null)} />
            <motion.div key="item-sheet"
              variants={sheet} initial="hidden" animate="show" exit="exit"
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
              <div className="w-full max-w-[480px] bg-[#1e293b] rounded-t-3xl overflow-hidden shadow-2xl">
                <div className="relative h-56 bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={foodImg(selected.name, selected.image_url)} alt={selected.name}
                    className="w-full h-full object-cover" />
                  <div className="absolute inset-0"
                    style={{ background: 'linear-gradient(to bottom, transparent 50%, #1e293b 100%)' }} />
                  <button onClick={() => setSelected(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="px-5 pb-8 pt-4 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h2 className="text-white text-xl font-bold" style={serif}>{selected.name}</h2>
                      {selected.description && (
                        <p className="text-slate-400 text-sm mt-1">{selected.description}</p>
                      )}
                    </div>
                    <p className="text-xl font-bold shrink-0" style={{ color: themeColor }}>
                      {sym}{Number(selected.price).toFixed(2)}
                    </p>
                  </div>

                  {/* Qty selector */}
                  <div className="flex items-center justify-between bg-white/5 rounded-2xl p-1">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-white font-bold text-lg w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => q + 1)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ background: themeColor }}>
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      addItem(selected, qty)
                      toast.success(`${selected.name} added`)
                      setSelected(null)
                    }}
                    className="w-full py-4 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
                    style={{ background: themeColor }}>
                    <Plus className="w-5 h-5" />
                    Add to Cart · {sym}{(Number(selected.price) * qty).toFixed(2)}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══ CART DRAWER ═════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div key="cart-overlay"
              variants={overlayVariant} initial="hidden" animate="show" exit="exit"
              className="fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
              onClick={() => setCartOpen(false)} />
            <motion.div key="cart-sheet"
              variants={sheet} initial="hidden" animate="show" exit="exit"
              className="fixed bottom-0 left-0 right-0 z-50 flex justify-center">
              <div className="w-full max-w-[480px] bg-[#1e293b] rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8">
                  <h2 className="text-white text-lg font-bold" style={serif}>Your Order</h2>
                  <button onClick={() => setCartOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  <AnimatePresence>
                    {items.map(item => (
                      <motion.div key={item.menuItem.id}
                        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                        className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{item.menuItem.name}</p>
                          <p className="text-slate-400 text-xs">{sym}{Number(item.menuItem.price).toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-white font-bold text-sm w-5 text-center">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                            style={{ background: themeColor }}>
                            <Plus className="w-3 h-3" />
                          </button>
                          <button onClick={() => removeItem(item.menuItem.id)}
                            className="ml-1 text-slate-500 hover:text-red-400 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-white font-bold text-sm w-14 text-right shrink-0">
                          {sym}{(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                        </p>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="px-5 pt-4 pb-8 border-t border-white/8 space-y-4">
                  <div className="flex justify-between text-white">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg">{sym}{total().toFixed(2)}</span>
                  </div>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Your name (optional)"
                    className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-white/30 transition-colors" />
                  <textarea
                    value={orderNotes}
                    onChange={e => setOrderNotes(e.target.value)}
                    placeholder="Any special requests? (optional)"
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-white placeholder:text-slate-500 text-sm outline-none focus:border-white/30 transition-colors resize-none" />
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={placeOrder}
                    disabled={placing || items.length === 0}
                    className="w-full py-4 rounded-2xl text-white font-semibold text-base disabled:opacity-50"
                    style={{ background: themeColor }}>
                    {placing ? 'Placing Order…' : `Place Order · ${sym}${total().toFixed(2)}`}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
