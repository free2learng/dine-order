'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Clock, ChefHat, Bell, CheckCircle2, LogOut, RefreshCw,
  Users, TrendingUp, QrCode, Download, Printer, MapPin, KeyRound,
} from 'lucide-react'
import type { OrderStatus, RestaurantTable } from '@/types'
import { useRouter } from 'next/navigation'
import { ChangePassword } from '@/components/shared/change-password'

// ── Design tokens ─────────────────────────────────────────────────────────────
const BG      = '#0a0d12'
const CARD    = '#181b22'
const SURFACE = '#111318'
const SAGE    = '#3d7a5a'
const BORDER  = 'rgba(255,255,255,0.07)'

const STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered']

interface StatusCfg {
  label: string
  color: string
  bgColor: string
  borderColor: string
  leftBorder: string
  icon: React.ReactNode
  actionLabel: string
}

const STATUS_CONFIG: Record<string, StatusCfg> = {
  pending: {
    label: 'Pending', color: '#fbbf24', bgColor: 'rgba(245,158,11,0.13)',
    borderColor: 'rgba(245,158,11,0.35)', leftBorder: '#f59e0b',
    icon: <Clock size={14} />, actionLabel: 'Confirm',
  },
  confirmed: {
    label: 'Confirmed', color: '#60a5fa', bgColor: 'rgba(59,130,246,0.13)',
    borderColor: 'rgba(59,130,246,0.35)', leftBorder: '#3b82f6',
    icon: <CheckCircle2 size={14} />, actionLabel: 'Start Prep',
  },
  preparing: {
    label: 'Preparing', color: '#fb923c', bgColor: 'rgba(249,115,22,0.13)',
    borderColor: 'rgba(249,115,22,0.35)', leftBorder: '#f97316',
    icon: <ChefHat size={14} />, actionLabel: 'Mark Ready',
  },
  ready: {
    label: 'Ready', color: '#4ade80', bgColor: 'rgba(34,197,94,0.13)',
    borderColor: 'rgba(34,197,94,0.35)', leftBorder: '#22c55e',
    icon: <Bell size={14} />, actionLabel: 'Delivered',
  },
  delivered: {
    label: 'Delivered', color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)',
    borderColor: 'rgba(107,114,128,0.25)', leftBorder: '#6b7280',
    icon: <CheckCircle2 size={14} />, actionLabel: '',
  },
  cancelled: {
    label: 'Cancelled', color: '#f87171', bgColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.25)', leftBorder: '#ef4444',
    icon: <CheckCircle2 size={14} />, actionLabel: '',
  },
}

const TABLE_STATUS_CONFIG: Record<RestaurantTable['status'], { label: string; color: string; dot: string }> = {
  available: { label: 'Available', color: '#4ade80', dot: '#22c55e' },
  occupied:  { label: 'Occupied',  color: '#f87171', dot: '#ef4444' },
  reserved:  { label: 'Reserved',  color: '#60a5fa', dot: '#3b82f6' },
  cleaning:  { label: 'Cleaning',  color: '#fbbf24', dot: '#f59e0b' },
}

export function StaffDashboard({ staff, restaurant, initialOrders }: any) {
  const [orders, setOrders]             = useState<any[]>(initialOrders)
  const [tables, setTables]             = useState<RestaurantTable[]>([])
  const [activeTab, setActiveTab]       = useState<'live' | 'all' | 'tables'>('live')
  const [updating, setUpdating]         = useState<number | null>(null)
  const [todayStats, setTodayStats]     = useState({ orders: 0, revenue: 0 })
  const [changePw, setChangePw]         = useState(false)
  const [tablesLoaded, setTablesLoaded] = useState(false)
  const router   = useRouter()
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
  }, [restaurant.id, activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [restaurant.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTables = useCallback(async () => {
    if (tablesLoaded) return
    const { data } = await supabase
      .from('restaurant_tables')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('table_number')
    if (data) { setTables(data); setTablesLoaded(true) }
  }, [restaurant.id, tablesLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchOrders(); fetchStats()
    const channel = supabase.channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurant.id}` },
        () => { fetchOrders(); fetchStats(); toast.info('Order updated!') })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchOrders, fetchStats, restaurant.id]) // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── QR helpers ────────────────────────────────────────────────────────────
  const origin   = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const tableUrl = (tableNumber: string) => `${origin}/${restaurant.slug}/table/${tableNumber}`
  const qrUrl    = (tableNumber: string, size = 200) =>
    `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(tableUrl(tableNumber))}`

  const downloadQR = (tableNumber: string) => {
    const a = document.createElement('a')
    a.href = qrUrl(tableNumber, 400); a.download = `table-${tableNumber}-qr.png`; a.target = '_blank'; a.click()
  }

  const printQR = (tableNumber: string) => {
    const url = tableUrl(tableNumber)
    const win = window.open('', '_blank', 'width=400,height=500')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Table ${tableNumber} QR</title>
      <style>body{margin:0;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;text-align:center;padding:24px}
      img{width:280px;height:280px;border:2px solid #eee;border-radius:12px;margin-bottom:16px}
      h2{margin:0 0 4px;font-size:20px}p{margin:0;color:#666;font-size:13px;word-break:break-all}</style></head>
      <body onload="window.print()">
        <h2>${restaurant.name}</h2><p style="margin-bottom:16px;font-size:15px;color:#333">Table ${tableNumber}</p>
        <img src="${qrUrl(tableNumber, 280)}" /><p>${url}</p>
      </body></html>`)
    win.document.close()
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const liveOrders   = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
  const statusGroups = STATUS_FLOW.slice(0, 4).map(s => ({ status: s, orders: liveOrders.filter(o => o.status === s) }))

  const iconBtn = (onClick: () => void, icon: React.ReactNode, title: string) => (
    <button title={title} onClick={onClick} style={{
      width: 36, height: 36, borderRadius: 10, border: `1px solid ${BORDER}`,
      background: 'transparent', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.55)', transition: 'all 0.15s',
    }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
      {icon}
    </button>
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif' }}>
      <style>{`
        .staff-scroll::-webkit-scrollbar { height: 4px; }
        .staff-scroll::-webkit-scrollbar-track { background: transparent; }
        .staff-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 4px; }
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        background: SURFACE, borderBottom: `1px solid ${BORDER}`,
        boxShadow: '0 1px 12px rgba(0,0,0,0.3)',
      }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 20px',
          height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ color: 'white', fontWeight: 700, fontSize: 17, margin: 0, lineHeight: 1.2 }}>
              {restaurant.name}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, margin: 0 }}>
              {staff.name} · <span style={{ textTransform: 'capitalize' }}>{staff.role}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {iconBtn(() => { fetchOrders(); fetchStats() }, <RefreshCw size={16} />, 'Refresh')}
            {iconBtn(() => setChangePw(true), <KeyRound size={16} />, 'Change password')}
            {iconBtn(handleLogout, <LogOut size={16} />, 'Logout')}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px' }}>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24,
        }}>
          {[
            { label: "Today's Orders",  value: String(todayStats.orders),                                   valueColor: 'white',   icon: <Users size={16} /> },
            { label: "Today's Revenue", value: `${currency}${todayStats.revenue.toFixed(2)}`,               valueColor: '#4ade80', icon: <TrendingUp size={16} /> },
            { label: 'Live Orders',     value: String(liveOrders.length),                                   valueColor: 'white',   icon: <Clock size={16} /> },
            { label: 'Ready to Serve',  value: String(liveOrders.filter(o => o.status === 'ready').length), valueColor: '#fbbf24', icon: <Bell size={16} /> },
          ].map(stat => (
            <div key={stat.label} style={{
              background: CARD, borderRadius: 14, padding: '16px 18px',
              border: `1px solid ${BORDER}`, boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.35)' }}>{stat.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12 }}>{stat.label}</span>
              </div>
              <p style={{ color: stat.valueColor, fontWeight: 700, fontSize: 26, margin: 0, lineHeight: 1 }}>
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {([
            { key: 'live',   label: `Live Orders (${liveOrders.length})` },
            { key: 'all',    label: 'All Orders' },
            { key: 'tables', label: `Tables${tables.length ? ` (${tables.length})` : ''}` },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); if (tab.key !== 'tables') setTimeout(fetchOrders, 0) }}
              style={{
                padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: activeTab === tab.key ? 'white' : CARD,
                color: activeTab === tab.key ? '#0a0d12' : 'rgba(255,255,255,0.5)',
                boxShadow: activeTab === tab.key ? '0 2px 10px rgba(255,255,255,0.1)' : 'none',
              }}>
              {tab.key === 'tables' && (
                <QrCode size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle', marginTop: -2 }} />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Live Orders — Kanban ─────────────────────────────────────── */}
        {activeTab === 'live' && (
          <div className="staff-scroll" style={{
            display: 'flex', gap: 16, overflowX: 'auto',
            paddingBottom: 8, alignItems: 'flex-start',
          }}>
            {statusGroups.map(({ status, orders: groupOrders }) => {
              const cfg = STATUS_CONFIG[status]
              return (
                <div key={status} style={{
                  minWidth: 288, width: 288, flexShrink: 0,
                  display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                  {/* Column header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '9px 14px', borderRadius: 12,
                    background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`,
                  }}>
                    <span style={{ color: cfg.color }}>{cfg.icon}</span>
                    <span style={{ color: cfg.color, fontSize: 13, fontWeight: 700, flex: 1 }}>{cfg.label}</span>
                    <span style={{
                      background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`,
                      color: cfg.color, borderRadius: 100, fontSize: 11, fontWeight: 700,
                      padding: '1px 8px',
                    }}>
                      {groupOrders.length}
                    </span>
                  </div>
                  {/* Order cards */}
                  {groupOrders.map(order => (
                    <DarkOrderCard key={order.id} order={order} currency={currency}
                      onAdvance={() => advanceStatus(order)} onCancel={() => cancelOrder(order.id)}
                      updating={updating === order.id} />
                  ))}
                  {groupOrders.length === 0 && (
                    <div style={{
                      borderRadius: 12, border: `1px dashed ${BORDER}`,
                      padding: '28px 0', textAlign: 'center',
                      color: 'rgba(255,255,255,0.2)', fontSize: 13,
                    }}>
                      Empty
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* ── All Orders ────────────────────────────────────────────────── */}
        {activeTab === 'all' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {orders.length === 0 && (
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '48px 0', margin: 0 }}>
                No orders yet
              </p>
            )}
            {orders.map(order => (
              <DarkOrderCard key={order.id} order={order} currency={currency}
                onAdvance={() => advanceStatus(order)} onCancel={() => cancelOrder(order.id)}
                updating={updating === order.id} expanded />
            ))}
          </div>
        )}

        {/* ── Tables & QR Codes ─────────────────────────────────────────── */}
        {activeTab === 'tables' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                Scan with any phone camera to open the ordering page.
              </p>
              <button
                onClick={() => { setTablesLoaded(false); fetchTables() }}
                style={{
                  width: 32, height: 32, borderRadius: 8, border: `1px solid ${BORDER}`,
                  background: 'transparent', cursor: 'pointer', color: 'rgba(255,255,255,0.45)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <RefreshCw size={14} />
              </button>
            </div>

            {tables.length === 0 && (
              <div style={{
                borderRadius: 16, border: `1px dashed ${BORDER}`,
                padding: '48px 0', textAlign: 'center',
              }}>
                <QrCode size={32} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 10 }} />
                <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: '0 0 4px' }}>No tables found</p>
                <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, margin: 0 }}>Add tables in the database</p>
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 16,
            }}>
              {tables.map(table => {
                const stCfg = TABLE_STATUS_CONFIG[table.status] ?? TABLE_STATUS_CONFIG.available
                return (
                  <div key={table.id} style={{
                    background: CARD, borderRadius: 16,
                    border: `1px solid ${BORDER}`, overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
                  }}>
                    {/* QR image - white bg for scannability */}
                    <div style={{
                      padding: 20, background: 'white',
                      display: 'flex', justifyContent: 'center',
                    }}>
                      <div style={{ position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={qrUrl(table.table_number)}
                          alt={`QR for table ${table.table_number}`}
                          width={150} height={150}
                          style={{ borderRadius: 10, display: 'block' }}
                          loading="lazy"
                        />
                        {/* Logo overlay */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          pointerEvents: 'none',
                        }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 7,
                            background: restaurant.theme_color || SAGE,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontSize: 12, fontWeight: 700,
                            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                          }}>
                            {restaurant.name[0]}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Info */}
                    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ color: 'white', fontWeight: 700, fontSize: 14, margin: 0 }}>
                            Table {table.table_number}
                          </p>
                          {table.location && (
                            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: '2px 0 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={10} />{table.location}
                            </p>
                          )}
                        </div>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 10px', borderRadius: 100,
                          background: `${stCfg.dot}18`,
                          border: `1px solid ${stCfg.dot}40`,
                          fontSize: 11, fontWeight: 600, color: stCfg.color,
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: stCfg.dot, display: 'block' }} />
                          {stCfg.label}
                        </span>
                      </div>

                      {table.capacity && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Users size={10} />Seats {table.capacity}
                        </p>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {[
                          { label: 'Download', icon: <Download size={12} />, onClick: () => downloadQR(table.table_number) },
                          { label: 'Print',    icon: <Printer size={12} />,  onClick: () => printQR(table.table_number) },
                          { label: 'Test',     icon: <QrCode size={12} />,   onClick: () => window.open(tableUrl(table.table_number), '_blank') },
                        ].map(btn => (
                          <button
                            key={btn.label}
                            onClick={btn.onClick}
                            style={{
                              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                              padding: '7px 0', borderRadius: 9,
                              background: 'rgba(255,255,255,0.06)', border: `1px solid ${BORDER}`,
                              color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                            }}>
                            {btn.icon}{btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {changePw && <ChangePassword onClose={() => setChangePw(false)} />}
    </div>
  )
}

// ─── Dark Order Card ──────────────────────────────────────────────────────────
function DarkOrderCard({ order, currency, onAdvance, onCancel, updating, expanded }: {
  order: any; currency: string; onAdvance: () => void; onCancel: () => void;
  updating: boolean; expanded?: boolean
}) {
  const cfg        = STATUS_CONFIG[order.status as OrderStatus] ?? STATUS_CONFIG.pending
  const canAdvance = !['delivered', 'cancelled'].includes(order.status)
  const timeAgo    = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000)

  return (
    <div style={{
      background: CARD, borderRadius: 14,
      border: `1px solid ${BORDER}`,
      borderLeft: `4px solid ${cfg.leftBorder}`,
      padding: '14px 16px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Order meta */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>#{order.id}</span>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginLeft: 6 }}>
            · Table {order.restaurant_tables?.table_number}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{timeAgo}m ago</span>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 9px', borderRadius: 100, fontSize: 11, fontWeight: 600,
            background: cfg.bgColor, border: `1px solid ${cfg.borderColor}`, color: cfg.color,
          }}>
            {cfg.icon}{cfg.label}
          </span>
        </div>
      </div>

      {order.customer_name && (
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>👤 {order.customer_name}</p>
      )}

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {order.order_items?.map((item: any) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {item.quantity}× {item.menu_items?.name}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12 }}>
              {currency}{Number(item.subtotal).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p style={{
          fontSize: 12, background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.2)',
          color: '#fbbf24', borderRadius: 8, padding: '6px 10px', margin: 0,
        }}>
          📝 {order.notes}
        </p>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 10, borderTop: `1px solid ${BORDER}`,
      }}>
        <span style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>
          {currency}{Number(order.total).toFixed(2)}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          {canAdvance && (
            <button
              onClick={onCancel}
              disabled={updating}
              style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
                color: '#f87171', cursor: 'pointer',
              }}>
              Cancel
            </button>
          )}
          {canAdvance && (
            <button
              onClick={onAdvance}
              disabled={updating}
              style={{
                padding: '5px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: SAGE, border: 'none', color: 'white',
                cursor: updating ? 'not-allowed' : 'pointer',
                opacity: updating ? 0.6 : 1,
              }}>
              {updating ? '…' : cfg.actionLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
