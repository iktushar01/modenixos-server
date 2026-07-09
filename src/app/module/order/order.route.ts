import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { OrderController } from "./order.controller";
import { refundOrderZodSchema, updateOrderStatusZodSchema } from "./order.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/stats", ...ownerAuth, OrderController.getStats);
router.get("/", ...ownerAuth, OrderController.getAll);
router.get("/:id/invoice", ...ownerAuth, OrderController.getOwnerInvoice);
router.post("/:id/refund", ...ownerAuth, validateRequest(refundOrderZodSchema), OrderController.refund);
router.post("/:id/retry-payment", ...ownerAuth, OrderController.retryPayment);
router.get("/:id", ...ownerAuth, OrderController.getOne);
router.patch("/:id/status", ...ownerAuth, validateRequest(updateOrderStatusZodSchema), OrderController.updateStatus);

export const OrderRoute = router;
