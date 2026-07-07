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
router.post("/start-trial", ...ownerBillingAuth, BillingController.startTrial);
router.post("/portal", ...ownerBillingAuth, BillingController.createPortal);
router.post("/cancel", ...ownerBillingAuth, BillingController.cancel);

router.post("/ssl/success", BillingController.sslSuccessCallback);
router.get("/ssl/success", BillingController.sslSuccessCallback);
router.post("/ssl/fail", BillingController.sslFailCallback);
router.get("/ssl/fail", BillingController.sslFailCallback);
router.post("/ssl/cancel", BillingController.sslCancelCallback);
router.get("/ssl/cancel", BillingController.sslCancelCallback);
router.post("/ssl/ipn", BillingController.sslIpnCallback);

export const BillingRoute = router;
