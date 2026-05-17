import { Router } from "express";
import healthRouter from "./health";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import tablesRouter from "./tables";
import authRouter from "./auth";

const router = Router();

router.use(healthRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(tablesRouter);
router.use(authRouter);

export default router;
