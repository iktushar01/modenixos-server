import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { memoryUpload } from "../../../config/multer.config";
import { ProductController } from "./product.controller";
import { createProductZodSchema, updateProductZodSchema, reorderProductsZodSchema } from "./product.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.post("/", ...ownerAuth, memoryUpload.array("images", 10), validateRequest(createProductZodSchema), ProductController.create);
router.get("/", ...ownerAuth, ProductController.getAll);
router.patch("/reorder", ...ownerAuth, validateRequest(reorderProductsZodSchema), ProductController.reorder);
router.get("/:id", ...ownerAuth, ProductController.getOne);
router.patch("/:id", ...ownerAuth, memoryUpload.array("images", 10), validateRequest(updateProductZodSchema), ProductController.update);
router.delete("/:id", ...ownerAuth, ProductController.remove);

export const ProductRoute = router;
