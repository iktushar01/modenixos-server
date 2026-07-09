import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { memoryUpload } from "../../../config/multer.config";
import { CategoryController } from "./category.controller";
import { createCategoryZodSchema, updateCategoryZodSchema, reorderCategoriesZodSchema } from "./category.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.post("/", ...ownerAuth, memoryUpload.single("image"), validateRequest(createCategoryZodSchema), CategoryController.create);
router.get("/", ...ownerAuth, CategoryController.getAll);
router.patch("/reorder", ...ownerAuth, validateRequest(reorderCategoriesZodSchema), CategoryController.reorder);
router.get("/:id", ...ownerAuth, CategoryController.getOne);
router.patch("/:id", ...ownerAuth, memoryUpload.single("image"), validateRequest(updateCategoryZodSchema), CategoryController.update);
router.delete("/:id", ...ownerAuth, CategoryController.remove);

export const CategoryRoute = router;
