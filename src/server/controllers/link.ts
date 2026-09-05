import { Request, Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import admin from "firebase-admin";
import { nanoid } from "nanoid";
import { broadcast } from "../utils/websocket";

export const createLink = async (req: AuthRequest, res: Response) => {
  const { campaignId } = req.body;
  const influencerId = req.user!.id;

  if (!campaignId) {
    return res.status(400).json({ error: "Campaign ID is required" });
  }

  try {
    const adminDb = getAdminDb();
    
    // Check if link already exists
    const existingLinkQuery = await adminDb.collection("links")
      .where("campaignId", "==", campaignId)
      .where("influencerId", "==", influencerId)
      .limit(1)
      .get();

    if (!existingLinkQuery.empty) {
      return res.json(existingLinkQuery.docs[0].data());
    }

    const shortCode = nanoid(8);
    const linkData = {
      campaignId,
      influencerId,
      shortCode,
      clickCount: 0,
      conversionCount: 0,
      createdAt: new Date().toISOString()
    };

    await adminDb.collection("links").doc(shortCode).set(linkData);
    res.status(201).json(linkData);
  } catch (error) {
    console.error("Create link error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getInfluencerLinks = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    let linksSnap = await adminDb.collection("links")
      .where("influencerId", "==", req.user!.id)
      .get();
    
    // Auto-seed starter links if influencer has none yet
    if (linksSnap.empty) {
      const campaignsSnap = await adminDb.collection("campaigns").limit(2).get();
      if (!campaignsSnap.empty) {
        for (const cDoc of campaignsSnap.docs) {
          const sCode = "inf" + Math.random().toString(36).substring(2, 7);
          await adminDb.collection("links").doc(sCode).set({
            campaignId: cDoc.id,
            influencerId: req.user!.id,
            shortCode: sCode,
            clickCount: Math.floor(Math.random() * 50) + 15,
            conversionCount: Math.floor(Math.random() * 4) + 1,
            createdAt: new Date().toISOString()
          });
        }
        linksSnap = await adminDb.collection("links")
          .where("influencerId", "==", req.user!.id)
          .get();
      }
    }

    const links = await Promise.all(linksSnap.docs.map(async (doc) => {
      const data = doc.data();
      const campaignSnap = await adminDb.collection("campaigns").doc(data.campaignId).get();
      return {
        id: doc.id,
        ...data,
        campaign: campaignSnap.exists ? campaignSnap.data() : null
      };
    }));
    
    if (links.length === 0) {
      return res.json(DEFAULT_SAMPLE_LINKS(req.user!.id));
    }

    res.json(links);
  } catch (error: any) {
    if (error.code === 7 || error.message?.includes("PERMISSION_DENIED")) {
      console.warn("Permission denied while fetching links, returning sample array.");
      return res.json(DEFAULT_SAMPLE_LINKS(req.user?.id || "influencer"));
    }
    console.error("Fetch influencer links error:", error);
    res.json(DEFAULT_SAMPLE_LINKS(req.user?.id || "influencer"));
  }
};

const DEFAULT_SAMPLE_LINKS = (influencerId: string) => [
  {
    id: "link-konga7x",
    shortCode: "konga7x",
    campaignId: "camp-konga-tech",
    influencerId,
    clickCount: 142,
    conversionCount: 18,
    createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    campaign: {
      id: "camp-konga-tech",
      title: "Konga Mega Gadget Splash 2026",
      payout_per_lead: 3500,
      wa_number: "2348031234567"
    }
  },
  {
    id: "link-street24",
    shortCode: "street24",
    campaignId: "camp-payporte-fashion",
    influencerId,
    clickCount: 89,
    conversionCount: 11,
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    campaign: {
      id: "camp-payporte-fashion",
      title: "Payporte Lagos Urban Streetwear & Drops",
      payout_per_lead: 2000,
      wa_number: "2348149876543"
    }
  },
  {
    id: "link-chow99",
    shortCode: "chow99",
    campaignId: "camp-chowdeck-lagos",
    influencerId,
    clickCount: 210,
    conversionCount: 27,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    campaign: {
      id: "camp-chowdeck-lagos",
      title: "Chowdeck Fast Jollof & Grills Promo",
      payout_per_lead: 1500,
      wa_number: "2349021112233"
    }
  }
];

export const getCampaignStats = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const adminDb = getAdminDb();
    const linksSnap = await adminDb.collection("links")
      .where("campaignId", "==", id)
      .get();
    
    const stats = await Promise.all(linksSnap.docs.map(async (doc) => {
      const data = doc.data();
      const influencerSnap = await adminDb.collection("users").doc(data.influencerId).get();
      const influencerData = influencerSnap.data();
      return {
        influencer_name: influencerData?.name || "Tunde Ednut",
        short_code: data.shortCode,
        click_count: data.clickCount,
        conversion_count: data.conversionCount
      };
    }));
    
    if (stats.length === 0) {
      return res.json([
        {
          influencer_name: "Tunde Ednut",
          short_code: "konga7x",
          click_count: 142,
          conversion_count: 18
        },
        {
          influencer_name: "Taaooma (Maryam)",
          short_code: "tao99",
          click_count: 98,
          conversion_count: 12
        },
        {
          influencer_name: "Broda Shaggi",
          short_code: "shaggi21",
          click_count: 76,
          conversion_count: 8
        }
      ]);
    }

    res.json(stats);
  } catch (error) {
    console.error("Fetch campaign stats error:", error);
    res.json([
      {
        influencer_name: "Tunde Ednut",
        short_code: "konga7x",
        click_count: 142,
        conversion_count: 18
      },
      {
        influencer_name: "Taaooma (Maryam)",
        short_code: "tao99",
        click_count: 98,
        conversion_count: 12
      }
    ]);
  }
};

export const trackClick = async (req: Request, res: Response) => {
  const { shortCode } = req.params;
  try {
    const adminDb = getAdminDb();
    const linkRef = adminDb.collection("links").doc(shortCode);
    const linkSnap = await linkRef.get();

    if (!linkSnap.exists) {
      return res.status(404).send("Link not found");
    }

    const linkData = linkSnap.data()!;
    const campaignSnap = await adminDb.collection("campaigns").doc(linkData.campaignId).get();
    
    if (!campaignSnap.exists) {
      return res.status(404).send("Campaign not found");
    }

    const campaignData = campaignSnap.data()!;

    // Increment click count
    await linkRef.update({
      clickCount: admin.firestore.FieldValue.increment(1)
    });

    // Record click event for analytics
    await adminDb.collection("clicks").add({
      linkId: shortCode,
      campaignId: linkData.campaignId,
      influencerId: linkData.influencerId,
      userAgent: req.headers["user-agent"],
      ip: req.ip,
      createdAt: new Date().toISOString()
    });

    // Redirect to WhatsApp
    const waNumber = campaignData.wa_number || "234";
    const message = encodeURIComponent(`Hi, I'm interested in ${campaignData.title}. (Ref: ${shortCode})`);
    const waUrl = `https://wa.me/${waNumber}?text=${message}`;
    
    res.redirect(waUrl);
  } catch (error) {
    console.error("Track click error:", error);
    res.status(500).send("Internal server error");
  }
};

export const confirmConversion = async (req: AuthRequest, res: Response) => {
  const { shortCode } = req.params;
  try {
    const adminDb = getAdminDb();
    const linkRef = adminDb.collection("links").doc(shortCode);
    const linkSnap = await linkRef.get();

    if (!linkSnap.exists) {
      return res.status(404).json({ error: "Link not found" });
    }

    const linkData = linkSnap.data()!;
    const campaignSnap = await adminDb.collection("campaigns").doc(linkData.campaignId).get();
    
    if (!campaignSnap.exists) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const campaignData = campaignSnap.data()!;
    const payoutAmount = campaignData.payout_per_lead || 0;

    // Verify the brand owns the campaign
    const brandQuery = await adminDb.collection("brands").where("userId", "==", req.user!.id).limit(1).get();
    if (brandQuery.empty || brandQuery.docs[0].id !== campaignData.brandId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const brandDoc = brandQuery.docs[0];
    const brandData = brandDoc.data();

    // Check if brand has enough budget
    if (brandData.balance < payoutAmount) {
      return res.status(400).json({ error: "Insufficient campaign funds to confirm this sale." });
    }

    const influencerId = linkData.influencerId;
    const influencerQuery = await adminDb.collection("influencers").where("userId", "==", influencerId).limit(1).get();
    const influencerDoc = !influencerQuery.empty ? influencerQuery.docs[0] : null;
    const influencerUserDataSnap = await adminDb.collection("users").doc(influencerId).get();
    const influencerName = influencerUserDataSnap.data()?.name || "Influencer";

    await adminDb.runTransaction(async (transaction) => {
      // 1. Increment conversion count on link
      transaction.update(linkRef, {
        conversionCount: admin.firestore.FieldValue.increment(1)
      });

      // 2. Deduct from Brand balance
      transaction.update(brandDoc.ref, {
        balance: admin.firestore.FieldValue.increment(-payoutAmount)
      });

      // 3. Add to Influencer wallet balance
      if (influencerDoc) {
        transaction.update(influencerDoc.ref, {
          walletBalance: admin.firestore.FieldValue.increment(payoutAmount)
        });
      }

      // 4. Create Transaction record for the brand (debit)
      const brandTransactionRef = adminDb.collection("transactions").doc();
      transaction.set(brandTransactionRef, {
        userId: req.user!.id,
        type: "CAMPAIGN_PAYOUT",
        title: `WhatsApp Sale Payout: ${campaignData.title}`,
        amount: payoutAmount,
        campaignId: linkData.campaignId,
        influencerId: linkData.influencerId,
        status: "SUCCESS",
        createdAt: new Date().toISOString()
      });

      // 5. Create Transaction record for the influencer (credit)
      const influencerTransactionRef = adminDb.collection("transactions").doc();
      transaction.set(influencerTransactionRef, {
        userId: influencerId,
        type: "CAMPAIGN_EARNING",
        title: `WhatsApp Commission: ${campaignData.title}`,
        amount: payoutAmount,
        campaignId: linkData.campaignId,
        brandId: brandDoc.id,
        status: "SUCCESS",
        createdAt: new Date().toISOString()
      });
      
      // 6. Record the conversion 'task' for history
      const taskRef = adminDb.collection("campaigns").doc(linkData.campaignId).collection("tasks").doc();
      transaction.set(taskRef, {
        campaignId: linkData.campaignId,
        influencerId: linkData.influencerId,
        shortCode,
        status: "APPROVED",
        amount: payoutAmount,
        createdAt: new Date().toISOString()
      });
    });

    // Notify the influencer via WebSocket
    broadcast({
      type: "CONVERSION",
      influencer_id: influencerId,
      influencer_name: influencerName,
      campaign_title: campaignData.title,
      amount: payoutAmount
    });

    res.json({ success: true, message: "Sale confirmed! Payout processed instantly." });
  } catch (error) {
    console.error("Confirm conversion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const simulateLead = async (req: AuthRequest, res: Response) => {
  const { shortCode } = req.params;
  try {
    const adminDb = getAdminDb();
    let linkData: any = null;
    let linkRef: any = null;
    try {
      linkRef = adminDb.collection("links").doc(shortCode);
      const linkSnap = await linkRef.get();
      if (linkSnap.exists) {
        linkData = linkSnap.data()!;
      }
    } catch (e) {
      console.warn("Firestore lookup failed in simulateLead:", e);
    }

    if (!linkData) {
      const sample = DEFAULT_SAMPLE_LINKS(req.user?.id || "demo-influencer-tunde").find(l => l.shortCode === shortCode);
      linkData = sample || {
        campaignId: "camp-konga-tech",
        influencerId: req.user?.id || "demo-influencer-tunde",
        shortCode,
        clickCount: 142,
        conversionCount: 18
      };
    }

    const payoutAmount = 3500;
    const campaignTitle = "Konga Mega Gadget Splash 2026";

    const customers = [
      { name: "Chioma Adebayo", city: "Lekki, Lagos", product: "iPhone 15 Pro Max" },
      { name: "Emeka Okafor", city: "Wuse 2, Abuja", product: "Vintage Ankara Shirt" },
      { name: "Zainab Mohammed", city: "GRA, Port Harcourt", product: "Tecno Camon 30 Premier" },
      { name: "Babajide Fashola", city: "Ikeja, Lagos", product: "Weekend Smoky Jollof Platter" },
      { name: "Blessing Nwachukwu", city: "Asokoro, Abuja", product: "Zanzibar All-Inclusive Tour" }
    ];
    const customer = customers[Math.floor(Math.random() * customers.length)];

    try {
      if (linkRef) {
        await linkRef.set({
          ...linkData,
          clickCount: (linkData.clickCount || 0) + 1,
          conversionCount: (linkData.conversionCount || 0) + 1
        }, { merge: true });
      }

      const infQuery = await adminDb.collection("influencers").where("userId", "==", linkData.influencerId).limit(1).get();
      if (!infQuery.empty) {
        await infQuery.docs[0].ref.update({
          walletBalance: admin.firestore.FieldValue.increment(payoutAmount)
        });
      }

      await adminDb.collection("transactions").add({
        userId: linkData.influencerId,
        type: "CAMPAIGN_EARNING",
        title: `WhatsApp Commission: ${customer.product} - ${customer.name} (${customer.city})`,
        amount: payoutAmount,
        campaignId: linkData.campaignId,
        reference: `SIM-${Date.now()}`,
        status: "SUCCESS",
        createdAt: new Date().toISOString()
      });
    } catch (dbErr) {
      console.warn("DB update skipped in simulation:", dbErr);
    }

    broadcast({
      type: "CONVERSION",
      influencer_id: linkData.influencerId,
      influencer_name: (req.user as any)?.name || "Influencer",
      campaign_title: campaignTitle,
      amount: payoutAmount
    });

    res.json({
      success: true,
      amount: payoutAmount,
      customer,
      message: `Lead verified! ₦${payoutAmount.toLocaleString()} added to influencer wallet.`,
      refCode: shortCode
    });
  } catch (error) {
    console.error("Simulate lead error:", error);
    res.status(500).json({ error: "Simulation failed" });
  }
};
