import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { memoryUpload } from "../../../config/multer.config";
import { StoreController } from "./store.controller";
import { createStoreZodSchema, updateStoreZodSchema } from "./store.validation";
import { StoreMemberRoute } from "../store-member/store-member.route";

const router = Router();

router.use(StoreMemberRoute);

router.post(
  "/",
  checkAuth(Role.CLIENT),
  validateRequest(createStoreZodSchema),
  StoreController.createStore,
);

router.get("/me", checkAuth(Role.CLIENT), StoreController.getMyStore);

router.patch(
  "/:id",
  checkAuth(Role.CLIENT),
  memoryUpload.fields([
    { name: "logo", maxCount: 1 },
    { name: "banner", maxCount: 1 },
    { name: "heroSlides", maxCount: 20 },
  ]),
  validateRequest(updateStoreZodSchema),
  StoreController.updateStore,
);

export const StoreRoute = router;

export const PublicStoreRoute = Router();
PublicStoreRoute.get("/:slug", StoreController.getPublicStore);
