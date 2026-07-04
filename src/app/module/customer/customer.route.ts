import { Router } from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { CustomerController } from "./customer.controller";

const router = Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/", ...ownerAuth, CustomerController.getAll);
router.get("/:id", ...ownerAuth, CustomerController.getOne);

export const CustomerRoute = router;
