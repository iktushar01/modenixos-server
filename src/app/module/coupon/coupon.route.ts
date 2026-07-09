import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { CouponController } from "./coupon.controller";
import { createCouponZodSchema, updateCouponZodSchema } from "./coupon.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.post("/", ...ownerAuth, validateRequest(createCouponZodSchema), CouponController.create);
router.get("/", ...ownerAuth, CouponController.getAll);
router.patch("/:id", ...ownerAuth, validateRequest(updateCouponZodSchema), CouponController.update);
router.delete("/:id", ...ownerAuth, CouponController.remove);

export const CouponRoute = router;
