import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { ReviewController } from "./review.controller";
import { updateReviewZodSchema } from "./review.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/", ...ownerAuth, ReviewController.getAll);
router.patch("/:id", ...ownerAuth, validateRequest(updateReviewZodSchema), ReviewController.update);
router.delete("/:id", ...ownerAuth, ReviewController.remove);

export const ReviewRoute = router;
