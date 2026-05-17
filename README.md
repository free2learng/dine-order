# Dine Order 🍽️

A restaurant QR code ordering system — customers scan a QR code at their table, browse the menu on their phone, and place orders directly. Staff see orders in real time on the kitchen dashboard.

Similar to Nando's / Wetherspoons table ordering.

## Features

- 📱 **Customer app** — scan QR, browse menu, place order, track status
- 👨‍🍳 **Kitchen dashboard** — real-time order management
- 🍽️ **Menu management** — add/edit/remove items and categories
- 🪑 **Table management** — QR code generation per table
- 📊 **Order summary** — today's revenue and order counts

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)
- **ORM:** Drizzle ORM
- **Validation:** Zod
- **Auth:** JWT

## Getting Started

### 1. Set up the database

Run `supabase-setup.sql` in your Supabase SQL editor.

### 2. Configure environment

```bash
cp .env.example .env
# Fill in your DATABASE_URL and other values
```

### 3. Install dependencies

```bash
cd artifacts/api-server
npm install
```

### 4. Run the server

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Public (customers)
- `GET /api/menu/categories` — list menu categories
- `GET /api/menu/items` — list menu items
- `GET /api/tables/by-number/:number` — get table by number
- `POST /api/orders` — place an order
- `GET /api/orders/:id` — check order status

### Staff (requires auth token)
- `POST /api/auth/staff/login` — get auth token
- `GET /api/orders` — list all orders
- `PATCH /api/orders/:id/status` — update order status
- `POST /api/menu/items` — add menu item
- `PUT /api/menu/items/:id` — edit menu item
- `DELETE /api/menu/items/:id` — remove menu item
- `GET /api/tables/:id/qr` — get QR code for table
- `PATCH /api/tables/:id/status` — update table status
