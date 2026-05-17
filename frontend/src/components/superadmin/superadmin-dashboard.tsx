'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, LogOut, Building2, Users, ToggleLeft, ToggleRight, ExternalLink, ShoppingBag, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChangePassword } from '@/components/shared/change-password'
export function SuperAdminDashboard({ superAdmin, restaurants: initialRestaurants }: any) {
  const [restaurants, setRestaurants] = useState<any[]>(initialRestaurants)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showAddStaff, setShowAddStaff] = useState<number | null>(null)
  const [newR, setNewR] = useState({ name: '', slug: '', email: '', phone: '', address: '', theme_color: '#c8a96e' })
  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '', role: 'staff' })
  const [saving, setSaving] = useState(false)
  const [changePw, setChangePw] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const fetchRestaurants = async () => {
    const { data } = await supabase.from('restaurants').select('*, staff_members(count), orders(count)').order('created_at', { ascending: false })
    if (data) setRestaurants(data)
  }
  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      const { error } = await supabase.from('restaurants').insert({ ...newR, currency: 'EUR', active: true })
      if (error) throw error
      toast.success(`${newR.name} added!`)
      setNewR({ name: '', slug: '', email: '', phone: '', address: '', theme_color: '#c8a96e' })
      setShowAddForm(false); fetchRestaurants()
    } catch (err: any) { toast.error(err.message) } finally { setSaving(false) }
  }
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showAddStaff) return; setSaving(true)
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email: newStaff.email, password: newStaff.password })
      if (authError || !authData.user) throw authError
      const { error } = await supabase.from('staff_members').insert({ restaurant_id: showAddStaff, user_id: authData.user.id, name: newStaff.name, role: newStaff.role, active: true })
      if (error) throw error
      toast.success(`${newStaff.name} added! They'll receive a confirmation email.`)
      setNewStaff({ name: '', email: '', password: '', role: 'staff' }); setShowAddStaff(null)
    } catch (err: any) { toast.error(err.message) } finally { setSaving(false) }
  }
  const toggleRestaurant = async (id: number, current: boolean) => {
    await supabase.from('restaurants').update({ active: !current }).eq('id', id)
    fetchRestaurants(); toast.success(current ? 'Restaurant deactivated' : 'Restaurant activated')
  }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-card border-b sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">DineOrder <span className="text-xs font-normal text-muted-foreground ml-1">Super Admin</span></h1>
            <p className="text-xs text-muted-foreground">{superAdmin.email}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddForm(true)} size="sm"><Plus className="w-4 h-4 mr-1" />Add Restaurant</Button>
            <Button variant="ghost" size="sm" onClick={() => setChangePw(true)}><KeyRound className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Restaurants', value: restaurants.length, icon: <Building2 className="w-5 h-5" /> },
            { label: 'Active', value: restaurants.filter(r => r.active).length, icon: <ToggleRight className="w-5 h-5" /> },
            { label: 'Total Staff', value: restaurants.reduce((s: number, r: any) => s + (r.staff_members?.[0]?.count ?? 0), 0), icon: <Users className="w-5 h-5" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-card rounded-xl border p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">{stat.icon}<span className="text-xs">{stat.label}</span></div>
              <p className="text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>
        {showAddForm && (
          <div className="bg-card rounded-xl border p-6">
            <h2 className="font-semibold mb-4">Add New Restaurant</h2>
            <form onSubmit={handleAddRestaurant} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Name</Label><Input value={newR.name} onChange={e => setNewR(p => ({ ...p, name: e.target.value }))} placeholder="The Grand Bistro" required /></div>
              <div className="space-y-1.5"><Label>Slug</Label><Input value={newR.slug} onChange={e => setNewR(p => ({ ...p, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="grand-bistro" required /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={newR.email} onChange={e => setNewR(p => ({ ...p, email: e.target.value }))} placeholder="info@restaurant.com" /></div>
              <div className="space-y-1.5"><Label>Phone</Label><Input value={newR.phone} onChange={e => setNewR(p => ({ ...p, phone: e.target.value }))} placeholder="+353 1 234 5678" /></div>
              <div className="space-y-1.5 sm:col-span-2"><Label>Address</Label><Input value={newR.address} onChange={e => setNewR(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, Dublin" /></div>
              <div className="space-y-1.5">
                <Label>Theme Color</Label>
                <div className="flex gap-2">
                  <input type="color" value={newR.theme_color} onChange={e => setNewR(p => ({ ...p, theme_color: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border" />
                  <Input value={newR.theme_color} onChange={e => setNewR(p => ({ ...p, theme_color: e.target.value }))} placeholder="#c8a96e" />
                </div>
              </div>
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Adding...' : 'Add Restaurant'}</Button>
              </div>
            </form>
          </div>
        )}
        <div className="space-y-4">
          <h2 className="font-semibold">Restaurants ({restaurants.length})</h2>
          {restaurants.map((r: any) => (
            <div key={r.id} className="bg-card rounded-xl border p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ background: r.theme_color }}>{r.name[0]}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{r.name}</h3>
                      <Badge variant={r.active ? 'default' : 'secondary'}>{r.active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">/{r.slug} · {r.email || 'No email'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3.5 h-3.5" />{r.staff_members?.[0]?.count ?? 0} staff</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5" />{r.orders?.[0]?.count ?? 0} orders</span>
                  <Button size="sm" variant="outline" onClick={() => setShowAddStaff(r.id)}><Plus className="w-3.5 h-3.5 mr-1" />Add Staff</Button>
                  <a href={`/${r.slug}/table/T1`} target="_blank" className="inline-flex items-center h-7 gap-1 rounded-[min(var(--radius-md),12px)] border border-border bg-background px-2.5 text-[0.8rem] font-medium hover:bg-muted transition-colors"><ExternalLink className="w-3.5 h-3.5" />Preview</a>
                  <Button size="sm" variant="ghost" onClick={() => toggleRestaurant(r.id, r.active)}>
                    {r.active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                  </Button>
                </div>
              </div>
              {showAddStaff === r.id && (
                <form onSubmit={handleAddStaff} className="mt-4 pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <h4 className="sm:col-span-2 font-medium text-sm">Add Staff to {r.name}</h4>
                  <div className="space-y-1.5"><Label>Full Name</Label><Input value={newStaff.name} onChange={e => setNewStaff(p => ({ ...p, name: e.target.value }))} placeholder="Jane Smith" required /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" value={newStaff.email} onChange={e => setNewStaff(p => ({ ...p, email: e.target.value }))} placeholder="jane@restaurant.com" required /></div>
                  <div className="space-y-1.5"><Label>Temp Password</Label><Input type="password" value={newStaff.password} onChange={e => setNewStaff(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" required minLength={6} /></div>
                  <div className="space-y-1.5">
                    <Label>Role</Label>
                    <select value={newStaff.role} onChange={e => setNewStaff(p => ({ ...p, role: e.target.value }))} className="w-full px-3 py-2 rounded-md border bg-background text-sm">
                      <option value="owner">Owner</option><option value="manager">Manager</option><option value="staff">Staff</option><option value="kitchen">Kitchen</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2 flex gap-2 justify-end">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddStaff(null)}>Cancel</Button>
                    <Button type="submit" size="sm" disabled={saving}>{saving ? 'Adding...' : 'Add Staff Member'}</Button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </div>
      {changePw && <ChangePassword onClose={() => setChangePw(false)} />}
    </div>
  )
}
