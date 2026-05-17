import { Router, type IRouter } from "express";
import { eq, and, gte, sql, inArray } from "drizzle-orm";
import { db, ordersTable, orderItemsTable, menuItemsTable, tablesTable } from "../lib/db";
import { requireStaffAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

// Zod schemas
const CreateOrderBody = z.object({
  tableId: z.number().int().positive(),
  customerName: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.number().int().positive(),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
  })).min(1),
});

const UpdateOrderStatusBody = z.object({
  status: z.enum(["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"]),
});

// Helper — fetch order + items in 2 queries (no N+1)
async function fetchOrderWithItems(orderId: number) {
  const [order] = await db
    .select({
      id: ordersTable.id,
      tableId: ordersTable.tableId,
      tableNumber: tablesTable.tableNumber,
      status: ordersTable.status,
      total: ordersTable.total,
      customerName: ordersTable.customerName,
      notes: ordersTable.notes,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    })
    .from(ordersTable)
    .leftJoin(tablesTable, eq(ordersTable.tableId, tablesTable.id))
    .where(eq(ordersTable.id, orderId));

  if (!order) return null;

  const items = await db
    .select({
      id: orderItemsTable.id,
      menuItemId: orderItemsTable.menuItemId,
      menuItemName: menuItemsTable.name,
      quantity: orderItemsTable.quantity,
      unitPrice: orderItemsTable.unitPrice,
      subtotal: orderItemsTable.subtotal,
      notes: orderItemsTable.notes,
    })
    .from(orderItemsTable)
    .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
    .where(eq(orderItemsTable.orderId, orderId));

  return {
    ...order,
    tableNumber: order.tableNumber ?? "",
    total: Number(order.total),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString() ?? order.createdAt.toISOString(),
    items: items.map(i => ({
      ...i,
      menuItemName: i.menuItemName ?? "",
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
  };
}

// GET /orders/summary — staff only
router.get("/orders/summary", requireStaffAuth, async (_req, res): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [counts] = await db.select({
      total: sql<number>`count(*)::int`,
      pending: sql<number>`count(*) filter (where status = 'pending')::int`,
      confirmed: sql<number>`count(*) filter (where status = 'confirmed')::int`,
      preparing: sql<number>`count(*) filter (where status = 'preparing')::int`,
      ready: sql<number>`count(*) filter (where status = 'ready')::int`,
      delivered: sql<number>`count(*) filter (where status = 'delivered')::int`,
      cancelled: sql<number>`count(*) filter (where status = 'cancelled')::int`,
    }).from(ordersTable);

    const [todayStats] = await db.select({
      todayOrders: sql<number>`count(*)::int`,
      todayRevenue: sql<number>`coalesce(sum(total::numeric), 0)::float`,
    }).from(ordersTable).where(gte(ordersTable.createdAt, today));

    res.json({
      total: counts?.total ?? 0,
      pending: counts?.pending ?? 0,
      confirmed: counts?.confirmed ?? 0,
      preparing: counts?.preparing ?? 0,
      ready: counts?.ready ?? 0,
      delivered: counts?.delivered ?? 0,
      cancelled: counts?.cancelled ?? 0,
      todayRevenue: todayStats?.todayRevenue ?? 0,
      todayOrders: todayStats?.todayOrders ?? 0,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order summary" });
  }
});

// GET /orders — staff only, fixed N+1 query
router.get("/orders", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const StatusFilter = z.object({
      status: z.enum(["pending","confirmed","preparing","ready","delivered","cancelled"]).optional(),
      tableId: z.coerce.number().optional(),
    });
    const parsed = StatusFilter.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const conditions = [];
    if (parsed.data.status) conditions.push(eq(ordersTable.status, parsed.data.status));
    if (parsed.data.tableId != null) conditions.push(eq(ordersTable.tableId, parsed.data.tableId));

    // Step 1: fetch orders
    const rows = await db
      .select({
        id: ordersTable.id,
        tableId: ordersTable.tableId,
        tableNumber: tablesTable.tableNumber,
        status: ordersTable.status,
        total: ordersTable.total,
        customerName: ordersTable.customerName,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
        updatedAt: ordersTable.updatedAt,
      })
      .from(ordersTable)
      .leftJoin(tablesTable, eq(ordersTable.tableId, tablesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(sql`${ordersTable.createdAt} desc`);

    if (rows.length === 0) { res.json([]); return; }

    // Step 2: fetch ALL items in ONE query (fixes N+1)
    const orderIds = rows.map(r => r.id);
    const allItems = await db
      .select({
        id: orderItemsTable.id,
        orderId: orderItemsTable.orderId,
        menuItemId: orderItemsTable.menuItemId,
        menuItemName: menuItemsTable.name,
        quantity: orderItemsTable.quantity,
        unitPrice: orderItemsTable.unitPrice,
        subtotal: orderItemsTable.subtotal,
        notes: orderItemsTable.notes,
      })
      .from(orderItemsTable)
      .leftJoin(menuItemsTable, eq(orderItemsTable.menuItemId, menuItemsTable.id))
      .where(inArray(orderItemsTable.orderId, orderIds));

    // Step 3: group items by orderId in memory
    const itemsByOrder = new Map<number, typeof allItems>();
    for (const item of allItems) {
      const list = itemsByOrder.get(item.orderId) ?? [];
      list.push(item);
      itemsByOrder.set(item.orderId, list);
    }

    const result = rows.map(row => ({
      ...row,
      tableNumber: row.tableNumber ?? "",
      total: Number(row.total),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? row.createdAt.toISOString(),
      items: (itemsByOrder.get(row.id) ?? []).map(i => ({
        ...i,
        menuItemName: i.menuItemName ?? "",
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// POST /orders — public (customers place orders)
router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { tableId, customerName, notes, items } = parsed.data;

  try {
    // Fetch menu items to validate + get prices
    const menuItemIds = items.map(i => i.menuItemId);
    const menuItems = await db
      .select()
      .from(menuItemsTable)
      .where(inArray(menuItemsTable.id, menuItemIds));

    const menuItemMap = new Map(menuItems.map(m => [m.id, m]));

    // Validate all items exist
    for (const item of items) {
      if (!menuItemMap.has(item.menuItemId)) {
        res.status(400).json({ error: `Menu item ${item.menuItemId} not found` });
        return;
      }
    }

    let total = 0;
    const orderItemsData = items.map(item => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const unitPrice = Number(menuItem.price);
      const subtotal = unitPrice * item.quantity;
      total += subtotal;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: String(unitPrice),
        subtotal: String(subtotal),
        notes: item.notes ?? null,
      };
    });

    // Use a transaction — if items insert fails, order is rolled back
    const fullOrder = await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(ordersTable)
        .values({
          tableId,
          customerName: customerName ?? null,
          notes: notes ?? null,
          status: "pending",
          total: String(total),
        })
        .returning();

      await tx.insert(orderItemsTable).values(
        orderItemsData.map(item => ({ ...item, orderId: order.id }))
      );

      return fetchOrderWithItems(order.id);
    });

    res.status(201).json(fullOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to create order" });
  }
});

// GET /orders/:id — public (customers can check their order)
router.get("/orders/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const order = await fetchOrderWithItems(id);
    if (!order) { res.status(404).json({ error: "Order not found" }); return; }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order" });
  }
});

// PATCH /orders/:id/status — staff only
router.patch("/orders/:id/status", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

    const body = UpdateOrderStatusBody.safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const [updated] = await db
      .update(ordersTable)
      .set({ status: body.data.status, updatedAt: new Date() })
      .where(eq(ordersTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Order not found" }); return; }

    const fullOrder = await fetchOrderWithItems(updated.id);
    res.json(fullOrder);
  } catch (err) {
    res.status(500).json({ error: "Failed to update order status" });
  }
});

export default router;
