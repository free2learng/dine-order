import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, categoriesTable, menuItemsTable } from "../lib/db";
import { requireStaffAuth } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const MenuItemBody = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().positive(),
  imageUrl: z.string().url().optional(),
  available: z.boolean().default(true),
  allergens: z.string().optional(),
  calories: z.number().int().optional(),
});

// GET /menu/categories — public
router.get("/menu/categories", async (_req, res): Promise<void> => {
  try {
    const categories = await db
      .select()
      .from(categoriesTable)
      .orderBy(categoriesTable.displayOrder);
    res.set("Cache-Control", "public, max-age=60");
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET /menu/items — public, fixed filter bug
router.get("/menu/items", async (req, res): Promise<void> => {
  try {
    const QuerySchema = z.object({
      categoryId: z.coerce.number().optional(),
      available: z.enum(["true","false"]).transform(v => v === "true").optional(),
    });
    const parsed = QuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    // Fixed: both filters can now be applied together
    const conditions = [];
    if (parsed.data.categoryId != null) conditions.push(eq(menuItemsTable.categoryId, parsed.data.categoryId));
    if (parsed.data.available != null) conditions.push(eq(menuItemsTable.available, parsed.data.available));

    const rows = await db
      .select({
        id: menuItemsTable.id,
        categoryId: menuItemsTable.categoryId,
        categoryName: categoriesTable.name,
        name: menuItemsTable.name,
        description: menuItemsTable.description,
        price: menuItemsTable.price,
        imageUrl: menuItemsTable.imageUrl,
        available: menuItemsTable.available,
        allergens: menuItemsTable.allergens,
        calories: menuItemsTable.calories,
      })
      .from(menuItemsTable)
      .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(categoriesTable.displayOrder, menuItemsTable.name);

    res.set("Cache-Control", "public, max-age=60");
    res.json(rows.map(r => ({ ...r, price: Number(r.price) })));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu items" });
  }
});

// GET /menu/items/:id — public
router.get("/menu/items/:id", async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [row] = await db
      .select({
        id: menuItemsTable.id,
        categoryId: menuItemsTable.categoryId,
        categoryName: categoriesTable.name,
        name: menuItemsTable.name,
        description: menuItemsTable.description,
        price: menuItemsTable.price,
        imageUrl: menuItemsTable.imageUrl,
        available: menuItemsTable.available,
        allergens: menuItemsTable.allergens,
        calories: menuItemsTable.calories,
      })
      .from(menuItemsTable)
      .leftJoin(categoriesTable, eq(menuItemsTable.categoryId, categoriesTable.id))
      .where(eq(menuItemsTable.id, id));

    if (!row) { res.status(404).json({ error: "Menu item not found" }); return; }
    res.json({ ...row, price: Number(row.price) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch menu item" });
  }
});

// POST /menu/items — staff only
router.post("/menu/items", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const parsed = MenuItemBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const [item] = await db.insert(menuItemsTable).values({
      ...parsed.data,
      price: String(parsed.data.price),
    }).returning();

    res.status(201).json({ ...item, price: Number(item.price) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// PUT /menu/items/:id — staff only
router.put("/menu/items/:id", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const parsed = MenuItemBody.partial().safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

    const updateData = { ...parsed.data, ...(parsed.data.price ? { price: String(parsed.data.price) } : {}) };
    const [item] = await db.update(menuItemsTable).set(updateData).where(eq(menuItemsTable.id, id)).returning();

    if (!item) { res.status(404).json({ error: "Menu item not found" }); return; }
    res.json({ ...item, price: Number(item.price) });
  } catch (err) {
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// DELETE /menu/items/:id — staff only
router.delete("/menu/items/:id", requireStaffAuth, async (req, res): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

    const [deleted] = await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Menu item not found" }); return; }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

export default router;
