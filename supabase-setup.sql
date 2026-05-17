-- ============================================================
-- Dine Order — Supabase Setup
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- SCHEMA --------------------------------------------------
CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "display_order" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "menu_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "category_id" integer NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL,
  "image_url" text,
  "available" boolean DEFAULT true NOT NULL,
  "allergens" text,
  "calories" integer
);

CREATE TABLE IF NOT EXISTS "restaurant_tables" (
  "id" serial PRIMARY KEY NOT NULL,
  "table_number" text NOT NULL,
  "capacity" integer DEFAULT 4 NOT NULL,
  "location" text,
  "status" text DEFAULT 'available' NOT NULL,
  CONSTRAINT "restaurant_tables_table_number_unique" UNIQUE("table_number")
);

CREATE TABLE IF NOT EXISTS "orders" (
  "id" serial PRIMARY KEY NOT NULL,
  "table_id" integer NOT NULL,
  "status" text DEFAULT 'pending' NOT NULL,
  "total" numeric(10, 2) DEFAULT '0' NOT NULL,
  "customer_name" text,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "order_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "order_id" integer NOT NULL,
  "menu_item_id" integer NOT NULL,
  "quantity" integer DEFAULT 1 NOT NULL,
  "unit_price" numeric(10, 2) NOT NULL,
  "subtotal" numeric(10, 2) NOT NULL,
  "notes" text
);

-- FOREIGN KEYS --------------------------------------------------
ALTER TABLE "menu_items" ADD CONSTRAINT IF NOT EXISTS "menu_items_category_id_fk"
  FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE no action;

ALTER TABLE "order_items" ADD CONSTRAINT IF NOT EXISTS "order_items_order_id_fk"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade;

ALTER TABLE "order_items" ADD CONSTRAINT IF NOT EXISTS "order_items_menu_item_id_fk"
  FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id") ON DELETE no action;

ALTER TABLE "orders" ADD CONSTRAINT IF NOT EXISTS "orders_table_id_fk"
  FOREIGN KEY ("table_id") REFERENCES "restaurant_tables"("id") ON DELETE no action;

-- AUTO-UPDATE updated_at trigger --------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- INDEXES --------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id);

-- SEED DATA --------------------------------------------------
INSERT INTO "categories" (id, name, description, display_order) VALUES
  (1, 'Starters',    'Light bites and sharing plates to kick things off', 1),
  (2, 'Mains',       'Hearty dishes and signature plates',                 2),
  (3, 'Burgers',     'Handcrafted burgers served with fries',              3),
  (4, 'Sides',       'Perfect companions to your main',                    4),
  (5, 'Desserts',    'Sweet endings to a great meal',                      5),
  (6, 'Soft Drinks', 'Refreshing non-alcoholic beverages',                 6),
  (7, 'Cocktails',   'Handcrafted cocktails and classics',                 7)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "menu_items" (id, category_id, name, description, price, available, allergens, calories) VALUES
  (1,  1, 'Crispy Calamari',             'Lightly battered squid rings with garlic aioli and lemon',          8.50,  true, 'Gluten, Molluscs', 380),
  (2,  1, 'Chicken Wings',               'Six spiced wings with blue cheese dip and celery sticks',           9.95,  true, 'Celery, Milk',     520),
  (3,  1, 'Loaded Nachos',               'Tortilla chips with cheddar, jalapeños, sour cream and guacamole', 7.95,  true, 'Milk, Gluten',     640),
  (4,  1, 'Soup of the Day',             'Served with warm crusty bread',                                     6.50,  true, 'Gluten, Milk',     290),
  (5,  1, 'Garlic Flatbread',            'Warm flatbread with roasted garlic butter and herbs',               4.95,  true, 'Gluten, Milk',     310),
  (6,  2, 'Beer-Battered Fish & Chips',  'Cod fillet in crispy batter with chips, mushy peas and tartare',  14.95,  true, 'Gluten, Fish',     920),
  (7,  2, 'Pan-Roasted Chicken',         'Free-range chicken with new potatoes, broccoli and tarragon sauce',15.50,  true, 'Milk, Celery',     680),
  (8,  2, 'Penne Arrabbiata',            'Pasta in spicy tomato sauce with fresh basil and parmesan',        11.95,  true, 'Gluten, Milk',     720),
  (9,  2, 'Slow-Cooked Beef Brisket',    '8-hour braised brisket with mash, carrots and red wine gravy',     18.95,  true, 'Celery, Milk',     890),
  (10, 2, 'Grilled Salmon',              'Atlantic salmon with crushed potatoes, green beans and lemon butter',16.95, true, 'Fish, Milk',       580),
  (11, 2, 'Mushroom & Lentil Shepherd''s Pie', 'Plant-based pie with creamy mash and green peas',           12.50,  true, 'Milk, Celery',     620),
  (12, 3, 'Classic Smash Burger',        'Two smashed patties, American cheese, lettuce, pickles in brioche',13.95,  true, 'Gluten, Milk, Sesame', 850),
  (13, 3, 'BBQ Bacon Burger',            'Beef patty, streaky bacon, BBQ sauce, crispy onions and cheddar', 14.95,  true, 'Gluten, Milk, Sesame', 980),
  (14, 3, 'Crispy Chicken Burger',       'Southern-fried chicken thigh with sriracha mayo and slaw',        13.50,  true, 'Gluten, Milk, Sesame', 820),
  (15, 3, 'The Plant Burger',            'Plant-based patty with smoked cheddar alternative and vegan mayo', 12.95,  true, 'Gluten, Sesame',   720),
  (16, 4, 'Thick-Cut Chips',             'Skin-on chips with sea salt and rosemary',                          3.95,  true, 'Gluten',           420),
  (17, 4, 'Sweet Potato Fries',          'Crispy sweet potato fries with chipotle dip',                       4.50,  true, null,               380),
  (18, 4, 'House Slaw',                  'Creamy coleslaw with apple and fresh herbs',                        2.95,  true, 'Eggs, Milk',       180),
  (19, 4, 'Onion Rings',                 'Beer-battered onion rings with smoky ketchup',                      3.95,  true, 'Gluten',           440),
  (20, 4, 'Garlic Butter Corn',          'Grilled corn on the cob with herb butter',                          3.50,  true, 'Milk',             220),
  (21, 5, 'Sticky Toffee Pudding',       'Warm date sponge with toffee sauce and clotted cream ice cream',   7.50,  true, 'Gluten, Milk',     680),
  (22, 5, 'Warm Chocolate Brownie',      'Fudgy brownie with salted caramel sauce and vanilla ice cream',    7.00,  true, 'Gluten, Milk, Nuts', 720),
  (23, 5, 'Cheesecake of the Day',       'Ask your server for today''s flavour',                              6.95,  true, 'Gluten, Milk',     580),
  (24, 5, 'Vegan Sorbet',               'Two scoops of seasonal fruit sorbet',                               5.50,  true, null,               220),
  (25, 6, 'Coca-Cola',                   '330ml can',                                                         2.95,  true, null,               139),
  (26, 6, 'Diet Coke',                   '330ml can',                                                         2.95,  true, null,               1),
  (27, 6, 'Sparkling Water',             '500ml bottle',                                                      2.50,  true, null,               0),
  (28, 6, 'Fresh Orange Juice',          'Freshly squeezed, served over ice',                                 3.50,  true, null,               112),
  (29, 6, 'Lemonade',                    'House-made cloudy lemonade with fresh mint',                        3.95,  true, null,               180),
  (30, 7, 'Espresso Martini',            'Vodka, coffee liqueur and fresh espresso',                          9.50,  true, null,               190),
  (31, 7, 'Aperol Spritz',               'Aperol, prosecco and soda with orange',                             8.95,  true, null,               165),
  (32, 7, 'Classic Mojito',              'White rum, fresh lime, mint and soda water',                        8.95,  true, null,               185),
  (33, 7, 'Passion Fruit Martini',       'Vanilla vodka, passion fruit liqueur, lime and prosecco',           9.50,  true, null,               210)
ON CONFLICT (id) DO NOTHING;

INSERT INTO "restaurant_tables" (id, table_number, capacity, location, status) VALUES
  (1,  'T1',  2, 'Window',        'available'),
  (2,  'T2',  2, 'Window',        'available'),
  (3,  'T3',  4, 'Main Floor',    'available'),
  (4,  'T4',  4, 'Main Floor',    'available'),
  (5,  'T5',  4, 'Main Floor',    'available'),
  (6,  'T6',  6, 'Main Floor',    'available'),
  (7,  'T7',  6, 'Main Floor',    'available'),
  (8,  'T8',  4, 'Bar Area',      'available'),
  (9,  'T9',  4, 'Bar Area',      'available'),
  (10, 'T10', 8, 'Private Dining','available'),
  (11, 'T11', 2, 'Outdoor',       'available'),
  (12, 'T12', 4, 'Outdoor',       'available')
ON CONFLICT (id) DO NOTHING;

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));
SELECT setval('menu_items_id_seq', (SELECT MAX(id) FROM menu_items));
SELECT setval('restaurant_tables_id_seq', (SELECT MAX(id) FROM restaurant_tables));
