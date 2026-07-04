import express from "express";
import { AuthRoute } from "../module/auth/auth.route";
import { UserRoutes } from "../module/user/user.route";
import { StoreRoute } from "../module/store/store.route";
import { CategoryRoute } from "../module/category/category.route";
import { CollectionRoute } from "../module/collection/collection.route";
import { ProductRoute } from "../module/product/product.route";
import { OrderRoute } from "../module/order/order.route";
import { CustomerRoute } from "../module/customer/customer.route";
import { ReviewRoute } from "../module/review/review.route";
import { CouponRoute } from "../module/coupon/coupon.route";
import { AnalyticsRoute } from "../module/analytics/analytics.route";
import { AdminRoute } from "../module/admin/admin.route";
import { PublicRoute } from "./public.route";

const router = express.Router();

router.use("/auth", AuthRoute);
router.use("/users", UserRoutes);
router.use("/stores", StoreRoute);
router.use("/categories", CategoryRoute);
router.use("/collections", CollectionRoute);
router.use("/products", ProductRoute);
router.use("/orders", OrderRoute);
router.use("/customers", CustomerRoute);
router.use("/reviews", ReviewRoute);
router.use("/coupons", CouponRoute);
router.use("/analytics", AnalyticsRoute);
router.use("/admin", AdminRoute);
router.use("/public", PublicRoute);

export const IndexRoute = router;
