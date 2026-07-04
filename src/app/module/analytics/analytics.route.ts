import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { AnalyticsController } from "./analytics.controller";

const router = Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/overview", ...ownerAuth, AnalyticsController.getOverview);
router.get("/charts", ...ownerAuth, AnalyticsController.getCharts);

export const AnalyticsRoute = router;
