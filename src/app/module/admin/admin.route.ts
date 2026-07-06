import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { suspendStoreZodSchema, adminOverridePlanZodSchema } from "./admin.validation";

const router = Router();
const adminAuth = checkAuth(Role.ADMIN, Role.SUPER_ADMIN);

router.get("/stores", adminAuth, AdminController.getStores);
router.patch("/stores/:id/suspend", adminAuth, validateRequest(suspendStoreZodSchema), AdminController.suspendStore);
router.get("/users", adminAuth, AdminController.getUsers);
router.get("/analytics", adminAuth, AdminController.getAnalytics);
router.get("/subscriptions", adminAuth, AdminController.getSubscriptions);
router.get("/subscriptions/:storeId", adminAuth, AdminController.getSubscription);
router.patch("/stores/:id/plan", adminAuth, validateRequest(adminOverridePlanZodSchema), AdminController.overridePlan);
router.get("/billing/analytics", adminAuth, AdminController.getBillingAnalytics);
router.get("/billing/failed-payments", adminAuth, AdminController.getFailedPayments);

export const AdminRoute = router;
