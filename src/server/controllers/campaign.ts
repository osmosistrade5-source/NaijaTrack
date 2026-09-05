import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import { z } from "zod";
import admin from "firebase-admin";

const campaignSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(5),
  budget: z.number().positive(),
  payout_per_lead: z.number().optional().default(2500),
  wa_number: z.string().optional().default("2348031234567"),
  category: z.string().optional().default("General"),
});

const DEFAULT_NIGERIAN_CAMPAIGNS = [
  {
    id: "camp-konga-tech",
    brandId: "brand-demo-brand-konga",
    title: "Konga Mega Gadget Splash 2026",
    description: "Drive verified WhatsApp buyers for iPhone 15/16 Pro, Samsung S24 & Oraimo FreePods with instant concierge delivery.",
    budget: 250000,
    payout_per_lead: 3500,
    wa_number: "2348031234567",
    category: "Tech & Gadgets",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: "camp-payporte-fashion",
    brandId: "brand-demo-brand-konga",
    title: "Payporte Lagos Urban Streetwear & Drops",
    description: "Gen-Z Nigerian fashion, oversized vintage tees, and luxury two-pieces with same-day Lagos & Abuja dispatch.",
    budget: 150000,
    payout_per_lead: 2000,
    wa_number: "2348149876543",
    category: "Fashion",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 36).toISOString()
  },
  {
    id: "camp-slot-smartphones",
    brandId: "brand-demo-brand-konga",
    title: "Slot Nigeria Official Device Exchange",
    description: "Promote brand-new smartphones with official 2-year warranty and free tempered glass nationwide.",
    budget: 300000,
    payout_per_lead: 4500,
    wa_number: "2347065551234",
    category: "Tech & Gadgets",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: "camp-chowdeck-lagos",
    brandId: "brand-demo-brand-konga",
    title: "Chowdeck Fast Jollof & Grills Promo",
    description: "Affiliate drive for weekend foodies ordering smoky party jollof, barbecue croaker fish & crispy chicken platters via WhatsApp.",
    budget: 100000,
    payout_per_lead: 1500,
    wa_number: "2349021112233",
    category: "Food & Groceries",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString()
  },
  {
    id: "camp-wakanow-travel",
    brandId: "brand-demo-brand-konga",
    title: "Wakanow Nairobi & Zanzibar Holiday Packages",
    description: "Target travel enthusiasts looking for all-inclusive vacation flight & hotel packages with private WhatsApp booking desk.",
    budget: 500000,
    payout_per_lead: 8500,
    wa_number: "2348053334455",
    category: "Travel & Tourism",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 3600000 * 12).toISOString()
  }
];

export const seedDefaultCampaignsAndLinks = async (adminDb: any, defaultBrandId = "brand-demo-brand-konga") => {
  try {
    const campaignsSnap = await adminDb.collection("campaigns").get();
    if (campaignsSnap.empty) {
      console.log("Seeding default Nigerian campaigns...");
      for (const camp of DEFAULT_NIGERIAN_CAMPAIGNS) {
        await adminDb.collection("campaigns").doc(camp.id).set({
          ...camp,
          brandId: defaultBrandId,
          createdAt: camp.created_at
        });
      }

      // Seed starter links for demo influencer
      const sampleLinks = [
        {
          shortCode: "konga7x",
          campaignId: "camp-konga-tech",
          influencerId: "demo-influencer-tunde",
          clickCount: 142,
          conversionCount: 18,
          createdAt: new Date().toISOString()
        },
        {
          shortCode: "street24",
          campaignId: "camp-payporte-fashion",
          influencerId: "demo-influencer-tunde",
          clickCount: 89,
          conversionCount: 11,
          createdAt: new Date().toISOString()
        },
        {
          shortCode: "chow99",
          campaignId: "camp-chowdeck-lagos",
          influencerId: "demo-influencer-tunde",
          clickCount: 210,
          conversionCount: 27,
          createdAt: new Date().toISOString()
        }
      ];

      for (const lk of sampleLinks) {
        await adminDb.collection("links").doc(lk.shortCode).set(lk);
      }
      console.log("Default Nigerian campaigns and tracking links seeded.");
    }
  } catch (err) {
    console.error("Error seeding default campaigns:", err);
  }
};

export const createCampaign = async (req: AuthRequest, res: Response) => {
  const parseBody = {
    title: req.body.title,
    description: req.body.description,
    budget: typeof req.body.budget === 'string' ? parseFloat(req.body.budget) : req.body.budget,
    payout_per_lead: typeof req.body.payout_per_lead === 'string' ? parseFloat(req.body.payout_per_lead) : req.body.payout_per_lead,
    wa_number: req.body.wa_number,
    category: req.body.category
  };

  const result = campaignSchema.safeParse(parseBody);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }

  const { title, description, budget, payout_per_lead, wa_number, category } = result.data;

  try {
    const adminDb = getAdminDb();
    const brandsRef = adminDb.collection("brands");
    const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
    
    let brandDoc: any = !brandQuery.empty ? brandQuery.docs[0] : null;

    if (!brandDoc) {
      // Fallback: create brand doc if not exists
      const newBrandRef = await brandsRef.add({
        userId: req.user!.id,
        companyName: req.user?.email?.split('@')[0] || "Brand Store",
        balance: 50000,
        subscriptionStatus: "active",
        createdAt: new Date().toISOString()
      });
      brandDoc = await newBrandRef.get();
    }

    const brandData = brandDoc.data()!;

    if ((brandData.balance || 0) < budget) {
      return res.status(400).json({ error: "Insufficient balance. Please deposit funds first." });
    }

    const campaignRef = adminDb.collection("campaigns").doc();
    const now = new Date().toISOString();
    
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(brandDoc!.ref, {
        balance: admin.firestore.FieldValue.increment(-budget)
      });
      
      transaction.set(campaignRef, {
        brandId: brandDoc!.id,
        title,
        description,
        budget,
        payout_per_lead,
        wa_number,
        category,
        status: "ACTIVE",
        createdAt: now,
        created_at: now
      });
    });

    res.status(201).json({ 
      id: campaignRef.id, 
      title, 
      description, 
      budget, 
      payout_per_lead, 
      wa_number, 
      category, 
      status: "ACTIVE",
      created_at: now
    });
  } catch (error) {
    console.error("Campaign creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      await seedDefaultCampaignsAndLinks(adminDb);

      let campaignsSnap = await adminDb.collection("campaigns").get();
      
      // If the authenticated user is a brand, ensure they have at least one active campaign
      if (req.user && (req.user.role === "BRAND" || req.user.role === "ADMIN")) {
        const brandsRef = adminDb.collection("brands");
        const brandQuery = await brandsRef.where("userId", "==", req.user.id).limit(1).get();
        const userBrandDoc = !brandQuery.empty ? brandQuery.docs[0] : null;
        
        if (userBrandDoc) {
          const userBrandId = userBrandDoc.id;
          const userBrandData = userBrandDoc.data();
          const brandCampaigns = campaignsSnap.docs.filter(doc => doc.data().brandId === userBrandId);
          
          if (brandCampaigns.length === 0) {
            // Auto-provision a starter campaign for this brand
            const starterCampRef = adminDb.collection("campaigns").doc();
            const starterData = {
              brandId: userBrandId,
              title: `${userBrandData.companyName || "Naija SME"} WhatsApp Flash Sale`,
              description: "High-impact performance campaign driving qualified WhatsApp shoppers with direct influencer attribution & instant escrow confirmation.",
              budget: 50000,
              payout_per_lead: 2500,
              wa_number: "2348039876543",
              category: "Commerce",
              status: "ACTIVE",
              created_at: new Date().toISOString(),
              createdAt: new Date().toISOString()
            };
            await starterCampRef.set(starterData);

            // Create a sample tracking link with initial performance stats
            const starterShortCode = "ref" + Math.random().toString(36).substring(2, 6);
            await adminDb.collection("links").doc(starterShortCode).set({
              campaignId: starterCampRef.id,
              influencerId: "demo-influencer-tunde",
              shortCode: starterShortCode,
              clickCount: 68,
              conversionCount: 5,
              createdAt: new Date().toISOString()
            });

            campaignsSnap = await adminDb.collection("campaigns").get();
          }
        }
      }

      const campaigns = await Promise.all(campaignsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const brandSnap = data.brandId ? await adminDb.collection("brands").doc(data.brandId).get() : null;
        return {
          id: doc.id,
          ...data,
          payout_per_lead: data.payout_per_lead || data.payoutPerLead || 2500,
          wa_number: data.wa_number || data.waNumber || "2348031234567",
          created_at: data.created_at || data.createdAt || new Date().toISOString(),
          brand: brandSnap && brandSnap.exists ? brandSnap.data() : null
        };
      }));

      res.json(campaigns);
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json(DEFAULT_NIGERIAN_CAMPAIGNS);
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
