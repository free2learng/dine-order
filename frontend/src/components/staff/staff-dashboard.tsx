'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Clock, ChefHat, Bell, CheckCircle2, LogOut, RefreshCw, Users, TrendingUp, QrCode, Download, Printer, MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { OrderStatus, RestaurantTable } from '@/types'
import { useRouter } from 'next/navigation'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']
const STATUS_CONFIG: Record<OrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:   { label: 'Pending',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',   icon: <Clock className="w-4 h-4" /> },
  confirmed: { label: 'Confirmed', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: <CheckCircle2 className="w-4 h-4" /> },
  preparing: { label: 'Preparing', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <ChefHat className="w-4 h-4" /> },
  ready:     { label: 'Ready',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: <Bell className="w-4 h-4" /> },
  delivered: { label: 'Delivered', color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',     icon: <CheckCircle2 className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: <CheckCircle2 className="w-4 h-4" /> },
}

const TABLE_STATUS_CONFIG: Record<RestaurantTable['status'], { label: string; color: string; dot: string }> = {
  available: { label: 'Available', color: 'text-green-700 bg-green-50 border-green-200', dot: 'bg-green-500' },
  occupied:  { label: 'Occupied',  color: 'text-red-700 bg-red-50 border-red-200',       dot: 'bg-red-500'   },
  reserved:  { label: 'Reserved',  color: 'text-blue-700 bg-blue-50 border-blue-200',    dot: 'bg-blue-500'  },
  cleaning:  { label: 'Cleaning',  color: 'text-amber-700 bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
}

export function StaffDashboard({ staff, restaurant, initialOrders }: any) {
  const [orders, setOrders]           = useState<any[]>(initialOrders)
  const [tables, setTables]           = useState<RestaurantTable[]>([])
  const [activeTab, setActiveTab]     = useState<'live' | 'all' | 'tables'>('live')
  const [updating, setUpdating]       = useState<number | null>(null)
  const [todayStats, setTodayStats]   = useState({ orders: 0, revenue: 0 })
  const [tablesLoaded, setTablesLoaded] = useState(false)
  const router  = useRouter()
  const supabase = createClient()
  const currency = restaurant.currency === 'EUR' ? '€' : restaurant.currency

  // ── Data fetching ─────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, restaurant_tables(table_number, location), order_items(*, menu_items(name))')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: true })
    if (activeTab === 'live') query = query.not('status', 'in', '("delivered","cancelled")')
    const { data } = await query
    if (data) setOrders(data)
  }, [restaurant.id, activeTab])

  const fetchStats = useCallback(async () => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const { data } = await supabase
      .from('orders')
      .select('total, status')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', today.toISOString())
    if (data) setTodayStats({
      orders: data.length,
      revenue: data.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
    })
  }, [restaurant.id])

  const fetchTables = useCallback(async () => {
    if (tablesLoaded) return
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('table_number')
    if (data) { setTables(data); setTablesLoaded(true) }
  }, [restaurant.id, tablesLoaded])

  useEffect(() => {
    fetchOrders(); fetchStats()
    const channel = supabase.channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => { fetchOrders(); fetchStats(); toast.info('Order updated!') })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchStats, restaurant.id])

  useEffect(() => {
    if (activeTab === 'tables') fetchTables()
  }, [activeTab, fetchTables])

  // ── Order actions ─────────────────────────────────────────────────────────
  const advanceStatus = async (order: any) => {
    const idx = STATUS_FLOW.indexOf(order.status)
    if (idx >= STATUS_FLOW.length - 1) return
    setUpdating(order.id)
    try {
      await supabase.from('orders').update({ status: STATUS_FLOW[idx + 1] }).eq('id', order.id)
      toast.success(`Order #${order.id} → ${STATUS_FLOW[idx + 1]}`); fetchOrders()
    } catch { toast.error('Failed to update') } finally { setUpdating(null) }
  }

  const cancelOrder = async (orderId: number) => {
    setUpdating(orderId)
    try {
      await supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      toast.error(`Order #${orderId} cancelled`); fetchOrders()
    } catch { toast.error('Failed to cancel') } finally { setUpdating(null) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  // ── QR code helpers ───────────────────────────────────────────────────────
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const tableUrl = (tableNumber: string) => `${origin}/${restaurant.slug}/table/${tableNumber}`
  const qrUrl    = (tableNumber: string, size = 200) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(tableUrl(tableNumber))}`

  const downloadQR = (tableNumber: string) => {
    const a = document.createElement('a')
    a.href = qrUrl(tableNumber, 400)
    a.download = `table-${tableNumber}-qr.png`
    a.target = '_blank'
    a.click()
  }

  const printQR = (tableNumber: string) => {
    const url = tableUrl(tableNumber)
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;text-align:center;padding:24px}
      img{width:280px;height:280px;border:2px solid #eee;border-radius:12px;margin-bottom:16px}
      h2{margin:0 0 4px;font-size:20px}p{margin:0;color:#666;font-size:13px;word-break:break-all}</style></head>
      <body onload="window.print()">
        <h2>${restaurant.name}</h2>
        <p style="margin-bottom:16px;font-size:15px;color:#333">Table ${tableNumber}</p>
        <img src="${qrUrl(tableNumber, 280)}" />
        <p>${url}</p>
      </body></html>
    `)
    win.document.close()
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const liveOrders   = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const statusGroups = STATUS_FLOW.slice(0, 4).map(s => ({ status: s, orders: liveOrders.filter(o => o.status === s) }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{restaurant.name}</h1>
            <p className="text-xs text-muted-foreground">Welcome, {staff.name} · {staff.role}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => { fetchOrders(); fetchStats() }}><RefreshCw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Today's Orders",  value: todayStats.orders,                                         icon: <Users className="w-4 h-4" /> },
            { label: "Today's Revenue", value: `${currency}${todayStats.revenue.toFixed(2)}`,             icon: <TrendingUp className="w-4 h-4" /> },
            { label: 'Live Orders',     value: liveOrders.length,                                         icon: <Clock className="w-4 h-4" /> },
            { label: 'Ready to Serve',  value: liveOrders.filter(o => o.status === 'ready').length,       icon: <Bell className="w-4 h-4" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">{stat.icon}<span className="text-xs">{stat.label}</span></div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: 'live',   label: `Live Orders (${liveOrders.length})` },
            { key: 'all',    label: 'All Orders' },
            { key: 'tables', label: `Tables${tables.length ? ` (${tables.length})` : ''}` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key !== 'tables') setTimeout(fetchOrders, 0) }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all ${
                activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-card border hover:bg-muted'
              }`}
            >
              {tab.key === 'tables' && <QrCode className="w-3.5 h-3.5 inline mr-1.5 -mt-px" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Live Orders ─────────────────────────────────────────────────── */}
        {activeTab === 'live' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusGroups.map(({ status, orders: groupOrders }) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} className="space-y-3">
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bg}`}>
                    <span className={cfg.color}>{cfg.icon}</span>
                    <span className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</span>
                    <Badge variant="secondary" className="ml-auto text-xs">{groupOrders.length}</Badge>
                  </div>
                  {groupOrders.map(order => (
                    <OrderCard key={order.id} order={order} currency={currency}
                      onAdvance={() => advanceStatus(order)} onCancel={() => cancelOrder(order.id)}
                      updating={updating === order.id} />
                  ))}
                  {groupOrders.length === 0 && (
                    <div className="rounded-xl border-2 border-dashed p-6 text-center text-sm text-muted-foreground">Empty</div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── All Orders ──────────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <div className="space-y-3">
            {orders.length === 0 && <p className="text-center text-muted-foreground py-12">No orders yet</p>}
            {orders.map(order => (
              <OrderCard key={order.id} order={order} currency={currency}
                onAdvance={() => advanceStatus(order)} onCancel={() => cancelOrder(order.id)}
                updating={updating === order.id} expanded />
            ))}
          </div>
        )}

        {/* ── Tables & QR Codes ───────────────────────────────────────────── */}
        {activeTab === 'tables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Scan with a phone camera or QR app to open the ordering page.
              </p>
              <Button variant="ghost" size="sm" onClick={() => { setTablesLoaded(false); fetchTables() }}>
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </div>

            {tables.length === 0 && (
              <div className="rounded-xl border-2 border-dashed p-12 text-center">
                <QrCode className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No tables found</p>
                <p className="text-xs text-muted-foreground mt-1">Add tables in the database to see QR codes here</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tables.map(table => {
                const statusCfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.available
                return (
                  <div key={table.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                    {/* QR code */}
                    <div className="p-5 flex justify-center bg-white">
                      <div className="relative">
                        <img
                          src={qrUrl(table.table_number)}
                          alt={`QR for table ${table.table_number}`}
                          width={160} height={160}
                          className="rounded-xl"
                          loading="lazy"
                        />
                        {/* Restaurant logo overlay */}
                        <div
                          className="absolute inset-0 flex items-center justify-center pointer-events-none"
                          style={{ paddingBottom: 1 }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow"
                            style={{ background: restaurant.theme_color || '#c8a96e' }}
                          >
                            {restaurant.name[0]}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 py-3 border-t space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-sm">Table {table.table_number}</p>
                          {table.location && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />{table.location}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.color}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                          {statusCfg.label}
                        </span>
                      </div>

                      {table.capacity && (
                        <p className="text-xs text-muted-foreground">
                          <Users className="w-3 h-3 inline mr-1" />Seats {table.capacity}
                        </p>
                      )}

                      {/* Buttons */}
                      <div className="flex gap-2 pt-0.5">
                        <button
                          onClick={() => downloadQR(table.table_number)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />Save
                        </button>
                        <button
                          onClick={() => printQR(table.table_number)}
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <Printer className="w-3.5 h-3.5" />Print
                        </button>
                        <a
                          href={tableUrl(table.table_number)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                        >
                          <QrCode className="w-3.5 h-3.5" />Test
                        </a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── OrderCard component ──────────────────────────────────────────────────────
function OrderCard({ order, currency, onAdvance, onCancel, updating, expanded }: any) {
  const cfg       = STATUS_CONFIG[order.status as OrderStatus]
  const canAdvance = !['delivered', 'cancelled'].includes(order.status)
  const timeAgo   = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)
  return (
    <div className="bg-card rounded-xl border p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-bold text-sm">#{order.id}</span>
          <span className="text-muted-foreground text-xs ml-2">· Table {order.restaurant_tables?.table_number}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${cfg.color}`}>{timeAgo}m ago</span>
          <Badge className={`text-xs ${cfg.color} ${cfg.bg} border`} variant="outline">{cfg.label}</Badge>
        </div>
      </div>
      {order.customer_name && <p className="text-xs text-muted-foreground">👤 {order.customer_name}</p>}
      <div className="space-y-1">
        {order.order_items?.map((item: any) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span>{item.quantity}× {item.menu_items?.name}</span>
            <span className="text-muted-foreground">{currency}{Number(item.subtotal).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {order.notes && <p className="text-xs bg-amber-50 text-amber-700 rounded-lg px-2 py-1.5">📝 {order.notes}</p>}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="font-bold text-sm">{currency}{Number(order.total).toFixed(2)}</span>
        <div className="flex gap-2">
          {canAdvance && <Button size="sm" onClick={onCancel} variant="ghost" disabled={updating} className="text-xs text-destructive hover:text-destructive h-7 px-2">Cancel</Button>}
          {canAdvance && (
            <Button size="sm" onClick={onAdvance} disabled={updating} className="text-xs h-7 px-3">
              {updating ? '…' : order.status === 'pending' ? 'Confirm' : order.status === 'confirmed' ? 'Prepare' : order.status === 'preparing' ? 'Ready' : 'Delivered'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
