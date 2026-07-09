import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { memoryUpload } from "../../../config/multer.config";
import { CollectionController } from "./collection.controller";
import { createCollectionZodSchema, updateCollectionZodSchema, reorderCollectionsZodSchema } from "./collection.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.post("/", ...ownerAuth, memoryUpload.single("image"), validateRequest(createCollectionZodSchema), CollectionController.create);
router.get("/", ...ownerAuth, CollectionController.getAll);
router.patch("/reorder", ...ownerAuth, validateRequest(reorderCollectionsZodSchema), CollectionController.reorder);
router.get("/:id", ...ownerAuth, CollectionController.getOne);
router.patch("/:id", ...ownerAuth, memoryUpload.single("image"), validateRequest(updateCollectionZodSchema), CollectionController.update);
router.delete("/:id", ...ownerAuth, CollectionController.remove);

export const CollectionRoute = router;
