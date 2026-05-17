import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const supabase = await createClient()

  // ── 1. Restaurant ────────────────────────────────────────────────────────────
  const { data: existing } = await supabase
    .from('restaurants')
    .select('id')
    .eq('slug', 'threemonks')
    .single()

  let restaurantId: number

  if (existing) {
    await supabase.from('restaurants').update({ active: true }).eq('id', existing.id)
    restaurantId = existing.id
  } else {
    const { data: r, error } = await supabase
      .from('restaurants')
      .insert({
        name: 'The Three Monks',
        slug: 'threemonks',
        email: 'hello@threemonks.ie',
        phone: '+353 1 234 5678',
        address: '12 Temple Bar, Dublin 2',
        currency: 'EUR',
        theme_color: '#c8a96e',
        active: true,
      })
      .select('id')
      .single()
    if (error || !r) return NextResponse.json({ error: error?.message ?? 'Failed to create restaurant' }, { status: 500 })
    restaurantId = r.id
  }

  // ── 2. Tables ────────────────────────────────────────────────────────────────
  const tables = [
    { table_number: 'T1', capacity: 2, location: 'Window' },
    { table_number: 'T2', capacity: 4, location: 'Window' },
    { table_number: 'T3', capacity: 4, location: 'Main Floor' },
    { table_number: 'T4', capacity: 6, location: 'Main Floor' },
    { table_number: 'T5', capacity: 2, location: 'Bar' },
    { table_number: 'T6', capacity: 8, location: 'Private Room' },
  ]
  for (const t of tables) {
    const { data: existing } = await supabase
      .from('restaurant_tables')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('table_number', t.table_number)
      .single()
    if (!existing) {
      await supabase.from('restaurant_tables').insert({ ...t, restaurant_id: restaurantId, status: 'available' })
    }
  }

  // ── 3. Categories ────────────────────────────────────────────────────────────
  const categoryDefs = [
    { name: 'Starters',    display_order: 1 },
    { name: 'Mains',       display_order: 2 },
    { name: 'Burgers',     display_order: 3 },
    { name: 'Sides',       display_order: 4 },
    { name: 'Desserts',    display_order: 5 },
    { name: 'Soft Drinks', display_order: 6 },
    { name: 'Cocktails',   display_order: 7 },
  ]

  const categoryIds: Record<string, number> = {}
  for (const cat of categoryDefs) {
    const { data: existing } = await supabase
      .from('categories')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('name', cat.name)
      .single()
    if (existing) {
      categoryIds[cat.name] = existing.id
    } else {
      const { data: c } = await supabase
        .from('categories')
        .insert({ ...cat, restaurant_id: restaurantId })
        .select('id')
        .single()
      if (c) categoryIds[cat.name] = c.id
    }
  }

  // ── 4. Menu items ─────────────────────────────────────────────────────────────
  const menuItems = [
    // Starters
    { cat: 'Starters', name: 'Crispy Calamari',      price: 8.50,  allergens: 'Gluten, Shellfish', description: 'Lightly battered squid with lemon aioli and chilli flakes' },
    { cat: 'Starters', name: 'Buffalo Wings',         price: 9.50,  allergens: 'Dairy',             description: '8 wings tossed in smoky buffalo sauce with blue cheese dip' },
    { cat: 'Starters', name: 'Loaded Nachos',         price: 8.00,  allergens: 'Dairy, Gluten',     description: 'Tortilla chips, cheddar, jalapeños, sour cream, guacamole' },
    { cat: 'Starters', name: 'Roasted Tomato Soup',   price: 6.50,  allergens: 'Gluten, Dairy',     description: 'Slow-roasted tomato with basil oil and crusty sourdough' },
    { cat: 'Starters', name: 'Garlic Flatbread',      price: 5.50,  allergens: 'Gluten, Dairy',     description: 'Stone-baked flatbread with roasted garlic butter and herbs' },
    // Mains
    { cat: 'Mains', name: 'Beer Battered Fish',       price: 15.50, allergens: 'Gluten, Fish',      description: 'Atlantic cod, hand-cut chips, mushy peas, tartare sauce' },
    { cat: 'Mains', name: 'Grilled Chicken',          price: 14.50, allergens: 'None',              description: 'Free-range chicken breast, chimichurri, roasted potatoes' },
    { cat: 'Mains', name: 'Penne Arrabbiata',         price: 12.50, allergens: 'Gluten, Dairy',     description: 'Penne in spicy tomato sauce, basil, parmesan shavings' },
    { cat: 'Mains', name: 'Slow Cooked Brisket',      price: 18.50, allergens: 'Dairy',             description: '10-hour beef brisket, mashed potato, red wine jus' },
    { cat: 'Mains', name: 'Pan Seared Salmon',        price: 17.00, allergens: 'Fish, Dairy',       description: 'Atlantic salmon, crushed new potatoes, dill cream sauce' },
    { cat: 'Mains', name: 'Steak & Ale Pie',          price: 16.00, allergens: 'Gluten, Dairy',     description: 'Shortcrust pastry, braised beef, root veg, mash' },
    // Burgers
    { cat: 'Burgers', name: 'Classic Burger',         price: 13.50, allergens: 'Gluten, Dairy',     description: '6oz beef patty, lettuce, tomato, pickles, burger sauce' },
    { cat: 'Burgers', name: 'BBQ Bacon Burger',       price: 15.00, allergens: 'Gluten, Dairy',     description: 'Beef patty, smoked bacon, cheddar, BBQ sauce, onion rings' },
    { cat: 'Burgers', name: 'Crispy Chicken Burger',  price: 13.00, allergens: 'Gluten, Dairy',     description: 'Buttermilk fried chicken, slaw, sriracha mayo' },
    // Sides
    { cat: 'Sides', name: 'Chunky Chips',             price: 4.00,  allergens: 'Gluten',            description: 'Hand-cut potatoes, sea salt, rosemary' },
    { cat: 'Sides', name: 'Thin Fries',               price: 3.50,  allergens: 'Gluten',            description: 'Golden shoestring fries with seasoned salt' },
    { cat: 'Sides', name: 'Homemade Slaw',            price: 3.00,  allergens: 'Dairy, Eggs',       description: 'Creamy coleslaw with apple and celery seed' },
    { cat: 'Sides', name: 'Onion Rings',              price: 4.50,  allergens: 'Gluten',            description: 'Beer-battered onion rings with smoky dip' },
    { cat: 'Sides', name: 'Corn on the Cob',          price: 3.50,  allergens: 'Dairy',             description: 'Grilled corn, chilli butter, parmesan' },
    // Desserts
    { cat: 'Desserts', name: 'Sticky Toffee Pudding', price: 7.00,  allergens: 'Gluten, Dairy, Eggs', description: 'Warm sponge, toffee sauce, vanilla ice cream' },
    { cat: 'Desserts', name: 'Chocolate Brownie',     price: 6.50,  allergens: 'Gluten, Dairy, Eggs', description: 'Warm dark chocolate brownie, salted caramel, cream' },
    { cat: 'Desserts', name: 'New York Cheesecake',   price: 6.50,  allergens: 'Dairy, Eggs, Gluten', description: 'Classic baked cheesecake, berry compote' },
    { cat: 'Desserts', name: 'Lemon Sorbet',          price: 5.00,  allergens: 'None',              description: 'Three scoops of house-made lemon sorbet' },
    // Soft Drinks
    { cat: 'Soft Drinks', name: 'Coca-Cola',          price: 3.00,  allergens: 'None', description: '330ml can, served with ice and lemon' },
    { cat: 'Soft Drinks', name: 'Still Water',        price: 2.00,  allergens: 'None', description: '500ml bottle of still mineral water' },
    { cat: 'Soft Drinks', name: 'Fresh Orange Juice', price: 3.50,  allergens: 'None', description: 'Freshly squeezed orange juice' },
    { cat: 'Soft Drinks', name: 'Homemade Lemonade',  price: 3.50,  allergens: 'None', description: 'House lemonade with mint and cucumber' },
    // Cocktails
    { cat: 'Cocktails', name: 'Classic Martini',      price: 11.00, allergens: 'None',       description: 'Gin or vodka, dry vermouth, green olive' },
    { cat: 'Cocktails', name: 'Aperol Spritz',        price: 10.00, allergens: 'Sulphites',  description: 'Aperol, prosecco, soda, orange slice' },
    { cat: 'Cocktails', name: 'Mojito',               price: 10.50, allergens: 'None',       description: 'White rum, fresh lime, mint, soda water' },
  ]

  let inserted = 0
  for (const item of menuItems) {
    const catId = categoryIds[item.cat]
    if (!catId) continue
    const { data: existing } = await supabase
      .from('menu_items')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('name', item.name)
      .single()
    if (!existing) {
      await supabase.from('menu_items').insert({
        restaurant_id: restaurantId,
        category_id: catId,
        name: item.name,
        description: item.description,
        price: item.price,
        allergens: item.allergens,
        available: true,
      })
      inserted++
    }
  }

  return NextResponse.json({
    ok: true,
    restaurantId,
    categories: Object.keys(categoryIds).length,
    menuItemsInserted: inserted,
    tables: tables.length,
    url: '/threemonks/table/T1',
  })
}
