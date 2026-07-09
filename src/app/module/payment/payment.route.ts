import express from "express";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentController } from "./payment.controller";
import { createPaymentZodSchema } from "./payment.validation";

const router = express.Router();

router.post("/success", PaymentController.successCallback);
router.get("/success", PaymentController.successCallback);
router.post("/fail", PaymentController.failCallback);
router.get("/fail", PaymentController.failCallback);
router.post("/cancel", PaymentController.cancelCallback);
router.get("/cancel", PaymentController.cancelCallback);
router.post("/ipn", PaymentController.ipnCallback);

export const PaymentRoute = router;

export const PublicPaymentRoute = express.Router({ mergeParams: true });

PublicPaymentRoute.post(
  "/create",
  validateRequest(createPaymentZodSchema),
  PaymentController.createPayment,
);
