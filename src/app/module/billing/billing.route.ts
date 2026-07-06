import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreOwner } from "../../middleware/attachStoreOwner";
import { validateRequest } from "../../middleware/validateRequest";
import { BillingController } from "./billing.controller";
import { checkoutZodSchema } from "./billing.validation";

const router = Router();
const ownerBillingAuth = [checkAuth(Role.CLIENT), attachStoreOwner] as const;

router.get("/plans", BillingController.getPlans);
router.get("/overview", ...ownerBillingAuth, BillingController.getOverview);
router.post("/checkout", ...ownerBillingAuth, validateRequest(checkoutZodSchema), BillingController.createCheckout);
router.post("/portal", ...ownerBillingAuth, BillingController.createPortal);
router.post("/cancel", ...ownerBillingAuth, BillingController.cancel);

export const BillingRoute = router;
