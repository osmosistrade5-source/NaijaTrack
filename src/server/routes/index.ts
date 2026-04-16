import { Router } from "express";
import { getProfile } from "../controllers/auth";
import { createCampaign, getCampaigns } from "../controllers/campaign";
import { fundWallet, paystackWebhook, payoutInfluencer } from "../controllers/payment";
import { getAdminStats, getAllUsers, getAllTransactions } from "../controllers/admin";
import { getBrandWallet, subscribeBrand, getBrands } from "../controllers/brand";
import { getInfluencerWallet, getInfluencers } from "../controllers/influencer";
import { createLink, getInfluencerLinks, getCampaignStats, confirmConversion } from "../controllers/link";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Auth routes
router.get("/auth/profile", authenticate, getProfile);

// Brand routes
router.get("/brands", authenticate, getBrands);
router.get("/brands/wallet", authenticate, authorize(["BRAND"]), getBrandWallet);
router.post("/brands/subscribe", authenticate, authorize(["BRAND"]), subscribeBrand);

// Influencer routes
router.get("/influencers", authenticate, getInfluencers);
router.get("/influencers/wallet", authenticate, authorize(["INFLUENCER"]), getInfluencerWallet);
router.get("/influencers/links", authenticate, authorize(["INFLUENCER"]), getInfluencerLinks);

// Campaign routes
router.post("/campaigns", authenticate, authorize(["BRAND"]), createCampaign);
router.get("/campaigns", authenticate, getCampaigns);
router.get("/campaigns/:id/stats", authenticate, getCampaignStats);

// Link routes
router.post("/links", authenticate, authorize(["INFLUENCER"]), createLink);
router.post("/links/:shortCode/convert", authenticate, authorize(["BRAND"]), confirmConversion);

// Payment routes
router.post("/payments/fund", authenticate, fundWallet);
router.post("/payments/webhook", paystackWebhook);
router.post("/payments/payout", authenticate, authorize(["ADMIN"]), payoutInfluencer);

// Admin routes
router.get("/admin/stats", authenticate, authorize(["ADMIN"]), getAdminStats);
router.get("/admin/users", authenticate, authorize(["ADMIN"]), getAllUsers);
router.get("/admin/transactions", authenticate, authorize(["ADMIN"]), getAllTransactions);

export default router;
