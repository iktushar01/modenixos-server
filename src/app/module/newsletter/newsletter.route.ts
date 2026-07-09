import express from "express";
import { Role } from "../../lib/prisma-exports";
import { checkAuth } from "../../middleware/checkAuth";
import { attachStoreId } from "../../middleware/attachStoreId";
import { validateRequest } from "../../middleware/validateRequest";
import { NewsletterController } from "./newsletter.controller";
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateNewsletterSettingsSchema,
} from "./newsletter.validation";

const router = express.Router();
const ownerAuth = [checkAuth(Role.CLIENT), attachStoreId] as const;

router.get("/stats", ...ownerAuth, NewsletterController.getStats);
router.get("/settings", ...ownerAuth, NewsletterController.getSettings);
router.patch("/settings", ...ownerAuth, validateRequest(updateNewsletterSettingsSchema), NewsletterController.updateSettings);

router.get("/subscribers", ...ownerAuth, NewsletterController.getSubscribers);
router.delete("/subscribers/:id", ...ownerAuth, NewsletterController.removeSubscriber);

router.get("/campaigns", ...ownerAuth, NewsletterController.getCampaigns);
router.post("/campaigns", ...ownerAuth, validateRequest(createCampaignSchema), NewsletterController.createCampaign);
router.get("/campaigns/:id", ...ownerAuth, NewsletterController.getCampaign);
router.patch("/campaigns/:id", ...ownerAuth, validateRequest(updateCampaignSchema), NewsletterController.updateCampaign);
router.post("/campaigns/:id/send", ...ownerAuth, NewsletterController.sendCampaign);
router.delete("/campaigns/:id", ...ownerAuth, NewsletterController.deleteCampaign);

export const NewsletterRoute = router;
