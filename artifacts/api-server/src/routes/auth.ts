import { Router, type IRouter } from "express";
import { generateStaffToken } from "../middlewares/auth";
import { z } from "zod";

const router: IRouter = Router();

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// POST /auth/staff/login
// In production, verify against Supabase Auth or your own staff table
router.post("/auth/staff/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  // Simple hardcoded check for now — replace with real DB lookup
  const STAFF_USERNAME = process.env["STAFF_USERNAME"] ?? "staff";
  const STAFF_PASSWORD = process.env["STAFF_PASSWORD"] ?? "changeme123";

  if (username !== STAFF_USERNAME || password !== STAFF_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = generateStaffToken("staff-1", "kitchen");
  res.json({ token, expiresIn: "8h" });
});

export default router;
