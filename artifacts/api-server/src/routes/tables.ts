import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, tablesTable } from "../lib/db";
import { requireStaffAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const TableBody = z.object({
  tableNumber: z.string().min(1),
  capacity: z.number().int().positive().default(4),
  location: z.string().optional(),
});

// GET /tables — public
router.get("/tables", async (_req, res): Promise<void> => {
  try {
    const tables = await db.select().from(tablesTable).orderBy(tablesTable.tableNumber);
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

// GET /tables/by-number/:number — public (used by QR scan)
router.get("/tables/by-number/:number", async (req, res): Promise<void> => {
  try {
    const [table] = await db
      .select()
      .from(tablesTable)
      .where(eq(tablesTable.tableNumber, req.params.number));

    if (!table) { res.status(404).json({ error: "Table not found" }); return; }
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch table" });
  }
});

// GET /tables/:id — public
router.get("/tables/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid table ID" }); return; }

    const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, id));
    if (!table) { res.status(404).json({ error: "Table not found" }); return; }

    res.json(table);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch table" });
  }
});

// GET /tables/:id/qr — generate QR code URL for a table
router.get("/tables/:id/qr", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid table ID" }); return; }

    const [table] = await db.select().from(tablesTable).where(eq(tablesTable.id, id));
    if (!table) { res.status(404).json({ error: "Table not found" }); return; }

    const baseUrl = process.env["FRONTEND_URL"] ?? "http://localhost:5173";
    const tableUrl = `${baseUrl}/table/${table.tableNumber}`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(tableUrl)}`;

    res.json({
      tableNumber: table.tableNumber,
      tableUrl,
      qrUrl,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

// POST /tables — staff only
router.post("/tables", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const parsed = TableBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [table] = await db.insert(tablesTable).values(parsed.data).returning();
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: "Failed to create table" });
  }
});

// PUT /tables/:id — staff only
router.put("/tables/:id", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid table ID" }); return; }

    const parsed = TableBody.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [table] = await db.update(tablesTable).set(parsed.data).where(eq(tablesTable.id, id)).returning();
    if (!table) { res.status(404).json({ error: "Table not found" }); return; }

    res.json(table);
  } catch (err) {
    res.status(500).json({ error: "Failed to update table" });
  }
});

// PATCH /tables/:id/status — staff only (set occupied/available)
router.patch("/tables/:id/status", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid table ID" }); return; }

    const body = z.object({
      status: z.enum(["available", "occupied", "reserved", "cleaning"]),
    }).safeParse(req.body);
    if (!body.success) { res.status(400).json({ error: body.error.message }); return; }

    const [table] = await db.update(tablesTable).set({ status: body.data.status }).where(eq(tablesTable.id, id)).returning();
    if (!table) { res.status(404).json({ error: "Table not found" }); return; }

    res.json(table);
  } catch (err) {
    res.status(500).json({ error: "Failed to update table status" });
  }
});

// DELETE /tables/:id — staff only
router.delete("/tables/:id", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid table ID" }); return; }

    const [deleted] = await db.delete(tablesTable).where(eq(tablesTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Table not found" }); return; }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete table" });
  }
});

export default router;
