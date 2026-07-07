import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { AnalyticsController } from "./analytics.controller";
import { analyticsRangeQuerySchema, trackStorefrontEventSchema } from "./analytics.validation";

const router = Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get(
  "/overview",
  ...ownerAuth,
  validateRequest(analyticsRangeQuerySchema, "query"),
  AnalyticsController.getOverview,
);
router.get(
  "/charts",
  ...ownerAuth,
  validateRequest(analyticsRangeQuerySchema, "query"),
  AnalyticsController.getCharts,
);

export const AnalyticsRoute = router;
export { trackStorefrontEventSchema };
