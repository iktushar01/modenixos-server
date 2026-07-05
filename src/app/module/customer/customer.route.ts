import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { CustomerController } from "./customer.controller";
import { createCustomerZodSchema, updateCustomerZodSchema } from "./customer.validation";

const router = Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/", ...ownerAuth, CustomerController.getAll);
router.post("/", ...ownerAuth, validateRequest(createCustomerZodSchema), CustomerController.create);
router.get("/:id", ...ownerAuth, CustomerController.getOne);
router.patch("/:id", ...ownerAuth, validateRequest(updateCustomerZodSchema), CustomerController.update);
router.delete("/:id", ...ownerAuth, CustomerController.remove);

export const CustomerRoute = router;
