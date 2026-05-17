'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useCartStore } from '@/store/cart'
import { toast } from 'sonner'
import {
  ShoppingCart, X, Plus, Minus, ChevronLeft,
  Clock, CheckCircle2, ChefHat, Bell, UtensilsCrossed, AlertTriangle,
} from 'lucide-react'
import type { Restaurant, Category, MenuItem, RestaurantTable, OrderStatus } from '@/types'

interface Props {
  restaurant: Restaurant
  table: RestaurantTable
  categories: Category[]
  menuItems: MenuItem[]
}

const SAGE     = '#3d7a5a'
const CREAM    = '#f7f5f0'
const SAND     = '#e8e2d8'
const OBSIDIAN = '#2c2c2a'

const serif: React.CSSProperties = { fontFamily: 'Georgia, "Times New Roman", serif' }

const ORDER_STEPS: { key: OrderStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending',   label: 'Order Received', icon: <Clock size={17} /> },
  { key: 'confirmed', label: 'Confirmed',       icon: <CheckCircle2 size={17} /> },
  { key: 'preparing', label: 'Preparing',       icon: <ChefHat size={17} /> },
  { key: 'ready',     label: 'Ready to Serve',  icon: <Bell size={17} /> },
  { key: 'delivered', label: 'Delivered',        icon: <UtensilsCrossed size={17} /> },
]

const sheetVariant: Variants = {
  hidden: { y: '100%' },
  show:   { y: 0, transition: { type: 'spring', damping: 32, stiffness: 320 } },
  exit:   { y: '100%', transition: { duration: 0.22, ease: 'easeIn' } },
}

const overlayVariant: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1 },
  exit:   { opacity: 0 },
}

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

export function CustomerApp({ restaurant, table, categories, menuItems }: Props) {
  const [screen, setScreen] = useState<'welcome' | 'menu' | 'tracking'>(() => {
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
  const [orderId, setOrderId] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null
    const saved = localStorage.getItem(`dineorder-${restaurant.id}-${table.id}-orderId`)
    return saved ? Number(saved) : null
  })
  const [orderStatus, setOrderStatus] = useState<OrderStatus>(() => {
    if (typeof window === 'undefined') return 'pending'
    return (localStorage.getItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`) as OrderStatus) || 'pending'
  })
  const tabsRef = useRef<HTMLDivElement>(null)

  const { items, addItem, removeItem, updateQuantity, clearCart, total, itemCount, setTable } = useCartStore()
  const supabase   = createClient()
  const sym        = currencySymbol(restaurant)
  const themeColor = restaurant.theme_color ?? SAGE

  useEffect(() => {
    if (!orderId) return
    const channel = supabase
      .channel(`order-tracking-${orderId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'orders',
        filter: `id=eq.${orderId}`,
      }, (payload) => {
        const newStatus = payload.new.status as OrderStatus
        setOrderStatus(newStatus)
        localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`, newStatus)
      })
      .subscribe()

    const interval = setInterval(async () => {
      const { data } = await supabase.from('orders').select('status').eq('id', orderId).single()
      if (data) {
        setOrderStatus(data.status as OrderStatus)
        localStorage.setItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`, data.status)
      }
    }, 8000)

    return () => { supabase.removeChannel(channel); clearInterval(interval) }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setTable(restaurant.id, table.table_number) }, [restaurant.id, table.table_number, setTable])

  useEffect(() => {
    if (!tabsRef.current || activeCat === null) return
    const btn = tabsRef.current.querySelector(`[data-cat="${activeCat}"]`) as HTMLElement | null
    btn?.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' })
  }, [activeCat])

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
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? 'Failed to place order')
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
      <div style={{
        minHeight: '100svh',
        background: `linear-gradient(160deg, #162b1e 0%, ${OBSIDIAN} 45%, #1c2e22 100%)`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 20px',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Restaurant badge */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 64, height: 64, borderRadius: 20,
              background: themeColor,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 26, fontWeight: 700, ...serif,
              marginBottom: 14,
            }}>
              {restaurant.name[0]}
            </div>
            <h1 style={{ color: 'white', fontSize: 20, fontWeight: 600, margin: 0, ...serif }}>
              {restaurant.name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: '4px 0 0' }}>
              Table {table.table_number}
            </p>
          </div>

          {/* Order number card */}
          <div style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '16px 20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 20,
          }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                Order
              </p>
              <p style={{ color: 'white', fontWeight: 700, fontSize: 24, margin: 0 }}>
                #{orderId}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 4px' }}>
                Status
              </p>
              <p style={{ color: themeColor, fontWeight: 600, fontSize: 14, margin: 0, textTransform: 'capitalize' }}>
                {orderStatus}
              </p>
            </div>
          </div>

          {/* Progress steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
            {ORDER_STEPS.filter(s => s.key !== 'cancelled').map((step, i) => {
              const done    = i < stepIdx
              const current = i === stepIdx
              return (
                <motion.div
                  key={step.key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '11px 16px', borderRadius: 14,
                    background: current ? 'rgba(255,255,255,0.09)' : 'transparent',
                    border: current ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                    opacity: done || current ? 1 : 0.32,
                  }}
                  animate={current ? { scale: [1, 1.01, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? SAGE : current ? themeColor : 'rgba(255,255,255,0.07)',
                    color: done || current ? 'white' : 'rgba(255,255,255,0.35)',
                  }}>
                    {done ? <CheckCircle2 size={17} /> : step.icon}
                  </div>
                  <span style={{
                    flex: 1,
                    color: current ? 'white' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.35)',
                    fontSize: 14, fontWeight: current ? 600 : 400,
                  }}>
                    {step.label}
                  </span>
                  {current && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[0, 1, 2].map(d => (
                        <motion.span key={d}
                          style={{ width: 6, height: 6, borderRadius: '50%', background: themeColor, display: 'block' }}
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.2 }} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>

          {orderStatus === 'delivered' ? (
            <button
              onClick={() => {
                setScreen('menu')
                setOrderId(null)
                localStorage.removeItem(`dineorder-${restaurant.id}-${table.id}-orderId`)
                localStorage.removeItem(`dineorder-${restaurant.id}-${table.id}-orderStatus`)
              }}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 16,
                background: themeColor, color: 'white', fontWeight: 700,
                fontSize: 16, border: 'none', cursor: 'pointer',
              }}>
              Order Again
            </button>
          ) : (
            <button
              onClick={() => setScreen('menu')}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 16,
                background: 'transparent', color: 'rgba(255,255,255,0.45)',
                fontWeight: 500, fontSize: 14,
                border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
              }}>
              Back to Menu
            </button>
          )}
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // WELCOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  if (screen === 'welcome') {
    return (
      <div style={{
        minHeight: '100svh',
        background: `linear-gradient(160deg, #152619 0%, ${OBSIDIAN} 45%, #1c2e22 100%)`,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end', position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient radial glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(61,122,90,0.18) 0%, transparent 70%)',
        }} />

        <motion.div
          style={{ padding: '0 24px 56px', maxWidth: 480, margin: '0 auto', width: '100%', position: 'relative' }}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          {/* Now Serving badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 14px', borderRadius: 100,
            background: 'rgba(61,122,90,0.18)', border: '1px solid rgba(61,122,90,0.35)',
            marginBottom: 22,
          }}>
            <motion.span
              style={{ width: 8, height: 8, borderRadius: '50%', background: SAGE, display: 'block' }}
              animate={{ opacity: [1, 0.35, 1] }}
              transition={{ repeat: Infinity, duration: 1.8 }}
            />
            <span style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              Now Serving
            </span>
          </div>

          <h1 style={{
            ...serif, fontSize: 54, fontWeight: 700,
            color: 'white', lineHeight: 1.05, margin: '0 0 12px',
          }}>
            {restaurant.name}
          </h1>

          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, margin: '0 0 36px' }}>
            Table {table.table_number}{table.location ? ` · ${table.location}` : ''}
          </p>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setScreen('menu')}
            style={{
              width: '100%', padding: '16px 0', borderRadius: 18,
              background: themeColor, color: 'white', fontWeight: 700, fontSize: 17,
              border: 'none', cursor: 'pointer',
              boxShadow: `0 10px 36px ${themeColor}55`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
            View Menu
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>

          <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 11, textAlign: 'center', margin: '18px 0 0' }}>
            Powered by DineOrder
          </p>
        </motion.div>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MENU SCREEN
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        .dine-ph::placeholder { color: rgba(255,255,255,0.22); }
        .dine-ph { color-scheme: dark; }
        .dine-tabs::-webkit-scrollbar { display: none; }
      `}</style>

      <div style={{ minHeight: '100svh', background: CREAM, paddingBottom: 96 }}>

        {/* Sticky header */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 30,
          background: 'white',
          borderBottom: `1px solid ${SAND}`,
          boxShadow: '0 1px 10px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            maxWidth: 480, margin: '0 auto',
            padding: '12px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <button
              onClick={() => setScreen('welcome')}
              style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: SAND, border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: OBSIDIAN,
              }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{
                ...serif, fontWeight: 700, fontSize: 16, color: OBSIDIAN,
                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {restaurant.name}
              </h1>
              <p style={{ fontSize: 11, color: '#aaa', margin: 0 }}>Table {table.table_number}</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setCartOpen(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                padding: '8px 14px', borderRadius: 12,
                background: themeColor, border: 'none', cursor: 'pointer',
                color: 'white', fontWeight: 600, fontSize: 14,
              }}>
              <ShoppingCart size={15} />
              {count > 0 && (
                <motion.span key={count} initial={{ scale: 0.5 }} animate={{ scale: 1 }}
                  style={{ fontWeight: 700 }}>
                  {count}
                </motion.span>
              )}
            </motion.button>
          </div>

          {/* Category tabs */}
          {categories.length > 0 && (
            <div
              ref={tabsRef}
              className="dine-tabs"
              style={{
                display: 'flex', gap: 8,
                padding: '0 16px 12px',
                overflowX: 'auto', scrollbarWidth: 'none',
              }}>
              <button
                data-cat="all"
                onClick={() => setActiveCat(null)}
                style={{
                  flexShrink: 0, padding: '6px 14px',
                  borderRadius: 100, fontSize: 13, fontWeight: 600,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  background: activeCat === null ? themeColor : SAND,
                  color: activeCat === null ? 'white' : '#777',
                  border: 'none', transition: 'all 0.18s',
                }}>
                🍽️ All
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  data-cat={cat.id}
                  onClick={() => setActiveCat(cat.id)}
                  style={{
                    flexShrink: 0, padding: '6px 14px',
                    borderRadius: 100, fontSize: 13, fontWeight: 600,
                    whiteSpace: 'nowrap', cursor: 'pointer',
                    background: activeCat === cat.id ? themeColor : SAND,
                    color: activeCat === cat.id ? 'white' : '#777',
                    border: 'none', transition: 'all 0.18s',
                  }}>
                  {getEmoji(cat.name)} {cat.name}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Menu items list */}
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '16px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCat ?? 'all'}
              style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}>
              {visibleItems.map(item => (
                <div key={item.id} style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setSelected(item); setQty(1) }}
                    disabled={!item.available}
                    style={{
                      width: '100%', textAlign: 'left', padding: 0,
                      display: 'flex', flexDirection: 'row',
                      background: 'white', borderRadius: 18,
                      border: `1px solid ${SAND}`,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.055)',
                      overflow: 'hidden',
                      cursor: item.available ? 'pointer' : 'default',
                      opacity: item.available ? 1 : 0.58,
                    }}>
                    {/* Image LEFT 96×96 */}
                    <div style={{
                      width: 96, height: 96, flexShrink: 0,
                      background: SAND, overflow: 'hidden',
                    }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={foodImg(item.name, item.image_url)}
                        alt={item.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        loading="lazy"
                      />
                    </div>
                    {/* Text RIGHT */}
                    <div style={{
                      flex: 1, minWidth: 0,
                      padding: '11px 44px 11px 14px',
                      display: 'flex', flexDirection: 'column',
                    }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: OBSIDIAN, margin: 0, lineHeight: 1.25 }}>
                        {item.name}
                      </p>
                      {item.description && (
                        <p style={{
                          fontSize: 12, color: '#999', margin: '3px 0 0', lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {item.description}
                        </p>
                      )}
                      {item.allergens && (
                        <p style={{ fontSize: 11, color: '#b45309', margin: '3px 0 0' }}>⚠️ {item.allergens}</p>
                      )}
                      <p style={{ fontWeight: 700, fontSize: 15, color: themeColor, margin: '5px 0 0' }}>
                        {sym}{Number(item.price).toFixed(2)}
                      </p>
                      {!item.available && (
                        <span style={{ fontSize: 11, color: '#ef4444', marginTop: 2, fontWeight: 500 }}>
                          Unavailable
                        </span>
                      )}
                    </div>
                  </button>
                  {/* + button bottom-right of card */}
                  {item.available && (
                    <button
                      onClick={() => { setSelected(item); setQty(1) }}
                      style={{
                        position: 'absolute', bottom: 10, right: 10,
                        width: 32, height: 32, borderRadius: '50%',
                        background: themeColor, border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', boxShadow: `0 4px 14px ${themeColor}44`,
                      }}>
                      <Plus size={15} />
                    </button>
                  )}
                </div>
              ))}
              {visibleItems.length === 0 && (
                <div style={{ padding: '64px 0', textAlign: 'center' }}>
                  <p style={{ color: '#bbb', fontSize: 14 }}>Nothing here yet</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Sticky cart bar */}
        <AnimatePresence>
          {count > 0 && !cartOpen && (
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20,
              display: 'flex', justifyContent: 'center',
              padding: '0 16px 20px', pointerEvents: 'none',
            }}>
              <motion.button
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1, transition: { type: 'spring', damping: 28, stiffness: 260 } }}
                exit={{ y: 80, opacity: 0, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setCartOpen(true)}
                style={{
                  pointerEvents: 'auto', width: '100%', maxWidth: 440,
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '14px 20px', borderRadius: 18,
                  background: themeColor, color: 'white', fontWeight: 600, fontSize: 15,
                  border: 'none', cursor: 'pointer',
                  boxShadow: `0 10px 36px ${themeColor}55`,
                }}>
                <span style={{
                  background: 'rgba(255,255,255,0.2)', borderRadius: 8,
                  padding: '2px 8px', fontSize: 13, fontWeight: 700,
                }}>
                  {count}
                </span>
                <span style={{ flex: 1, textAlign: 'left' }}>View Cart</span>
                <span>{sym}{total().toFixed(2)}</span>
              </motion.button>
            </div>
          )}
        </AnimatePresence>

        {/* ═══ ITEM DETAIL MODAL ═══════════════════════════════════════════ */}
        <AnimatePresence>
          {selected && (
            <>
              <motion.div key="item-overlay"
                variants={overlayVariant} initial="hidden" animate="show" exit="exit"
                onClick={() => setSelected(null)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 40,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                }} />
              <motion.div key="item-sheet"
                variants={sheetVariant} initial="hidden" animate="show" exit="exit"
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                  display: 'flex', justifyContent: 'center',
                }}>
                <div style={{
                  width: '100%', maxWidth: 480,
                  background: OBSIDIAN, borderRadius: '24px 24px 0 0',
                  overflow: 'hidden', boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
                }}>
                  {/* Large image */}
                  <div style={{ position: 'relative', height: 240, background: '#222' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={foodImg(selected.name, selected.image_url)}
                      alt={selected.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: `linear-gradient(to bottom, transparent 40%, ${OBSIDIAN} 100%)`,
                    }} />
                    <button
                      onClick={() => setSelected(null)}
                      style={{
                        position: 'absolute', top: 14, right: 14,
                        width: 34, height: 34, borderRadius: '50%',
                        background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                      }}>
                      <X size={15} />
                    </button>
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px 20px 36px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ ...serif, color: 'white', fontSize: 22, fontWeight: 700, margin: '0 0 6px' }}>
                          {selected.name}
                        </h2>
                        {selected.description && (
                          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: 0, lineHeight: 1.5 }}>
                            {selected.description}
                          </p>
                        )}
                      </div>
                      <p style={{ color: themeColor, fontWeight: 700, fontSize: 20, margin: 0, flexShrink: 0 }}>
                        {sym}{Number(selected.price).toFixed(2)}
                      </p>
                    </div>

                    {selected.allergens && (
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '6px 12px', borderRadius: 8,
                        background: 'rgba(180,83,9,0.14)',
                        border: '1px solid rgba(180,83,9,0.3)',
                        alignSelf: 'flex-start',
                      }}>
                        <AlertTriangle size={13} color="#f59e0b" />
                        <span style={{ fontSize: 12, color: '#fbbf24', fontWeight: 500 }}>
                          {selected.allergens}
                        </span>
                      </div>
                    )}

                    {/* Qty selector */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 4,
                    }}>
                      <button
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                        }}>
                        <Minus size={16} />
                      </button>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 18, width: 36, textAlign: 'center' }}>
                        {qty}
                      </span>
                      <button
                        onClick={() => setQty(q => q + 1)}
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: themeColor, border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                        }}>
                        <Plus size={16} />
                      </button>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { addItem(selected, qty); toast.success(`${selected.name} added`); setSelected(null) }}
                      style={{
                        width: '100%', padding: '15px 0', borderRadius: 16,
                        background: themeColor, color: 'white', fontWeight: 700, fontSize: 16,
                        border: 'none', cursor: 'pointer',
                        boxShadow: `0 6px 28px ${themeColor}44`,
                      }}>
                      Add to Order · {sym}{(Number(selected.price) * qty).toFixed(2)}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* ═══ CART DRAWER ═════════════════════════════════════════════════ */}
        <AnimatePresence>
          {cartOpen && (
            <>
              <motion.div key="cart-overlay"
                variants={overlayVariant} initial="hidden" animate="show" exit="exit"
                onClick={() => setCartOpen(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 40,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
                }} />
              <motion.div key="cart-sheet"
                variants={sheetVariant} initial="hidden" animate="show" exit="exit"
                style={{
                  position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                  display: 'flex', justifyContent: 'center',
                }}>
                <div style={{
                  width: '100%', maxWidth: 480,
                  background: OBSIDIAN, borderRadius: '24px 24px 0 0',
                  boxShadow: '0 -8px 48px rgba(0,0,0,0.45)',
                  display: 'flex', flexDirection: 'column', maxHeight: '85svh',
                }}>
                  {/* Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 20px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.07)',
                  }}>
                    <h2 style={{ ...serif, color: 'white', fontSize: 20, fontWeight: 700, margin: 0 }}>
                      Your Order
                    </h2>
                    <button
                      onClick={() => setCartOpen(false)}
                      style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,255,255,0.45)',
                      }}>
                      <X size={15} />
                    </button>
                  </div>

                  {/* Items */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <AnimatePresence>
                      {items.map(item => (
                        <motion.div key={item.menuItem.id}
                          initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'white', fontSize: 14, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.menuItem.name}
                            </p>
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '2px 0 0' }}>
                              {sym}{Number(item.menuItem.price).toFixed(2)} each
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity - 1)}
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                              }}>
                              <Minus size={12} />
                            </button>
                            <span style={{ color: 'white', fontWeight: 700, fontSize: 14, width: 20, textAlign: 'center' }}>
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.menuItem.id, item.quantity + 1)}
                              style={{
                                width: 28, height: 28, borderRadius: 7,
                                background: themeColor, border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
                              }}>
                              <Plus size={12} />
                            </button>
                            <button
                              onClick={() => removeItem(item.menuItem.id)}
                              style={{
                                marginLeft: 2, background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.28)', padding: 4,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                              <X size={14} />
                            </button>
                          </div>
                          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, width: 54, textAlign: 'right', flexShrink: 0, margin: 0 }}>
                            {sym}{(Number(item.menuItem.price) * item.quantity).toFixed(2)}
                          </p>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Footer */}
                  <div style={{
                    padding: '16px 20px 36px',
                    borderTop: '1px solid rgba(255,255,255,0.07)',
                    display: 'flex', flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: 500 }}>Total</span>
                      <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>{sym}{total().toFixed(2)}</span>
                    </div>
                    <input
                      className="dine-ph"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="Your name (optional)"
                      style={{
                        width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                        borderRadius: 12, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', fontSize: 14, outline: 'none',
                      }}
                    />
                    <textarea
                      className="dine-ph"
                      value={orderNotes}
                      onChange={e => setOrderNotes(e.target.value)}
                      placeholder="Any special requests? (optional)"
                      rows={2}
                      style={{
                        width: '100%', padding: '12px 16px', boxSizing: 'border-box',
                        borderRadius: 12, background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white', fontSize: 14, outline: 'none', resize: 'none',
                      }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={placeOrder}
                      disabled={placing || items.length === 0}
                      style={{
                        width: '100%', padding: '15px 0', borderRadius: 16,
                        background: themeColor, color: 'white', fontWeight: 700, fontSize: 16,
                        border: 'none', cursor: placing ? 'not-allowed' : 'pointer',
                        opacity: items.length === 0 ? 0.5 : 1,
                      }}>
                      {placing ? 'Placing Order…' : `Place Order · ${sym}${total().toFixed(2)}`}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
