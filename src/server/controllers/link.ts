import { Request, Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import admin from "firebase-admin";
import { nanoid } from "nanoid";

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
    const linksSnap = await adminDb.collection("links")
      .where("influencerId", "==", req.user!.id)
      .get();
    
    const links = await Promise.all(linksSnap.docs.map(async (doc) => {
      const data = doc.data();
      const campaignSnap = await adminDb.collection("campaigns").doc(data.campaignId).get();
      return {
        id: doc.id,
        ...data,
        campaign: campaignSnap.exists ? campaignSnap.data() : null
      };
    }));
    
    res.json(links);
  } catch (error) {
    console.error("Fetch influencer links error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

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
        influencer_name: influencerData?.name || "Unknown",
        short_code: data.shortCode,
        click_count: data.clickCount,
        conversion_count: data.conversionCount
      };
    }));
    
    res.json(stats);
  } catch (error) {
    console.error("Fetch campaign stats error:", error);
    res.status(500).json({ error: "Internal server error" });
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

    // Verify the brand owns the campaign
    const brandQuery = await adminDb.collection("brands").where("userId", "==", req.user!.id).limit(1).get();
    if (brandQuery.empty || brandQuery.docs[0].id !== campaignData.brandId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await adminDb.runTransaction(async (transaction) => {
      // Increment conversion count
      transaction.update(linkRef, {
        conversionCount: admin.firestore.FieldValue.increment(1)
      });

      // Create a task for payout
      const taskRef = adminDb.collection("campaigns").doc(linkData.campaignId).collection("tasks").doc();
      transaction.set(taskRef, {
        campaignId: linkData.campaignId,
        influencerId: linkData.influencerId,
        shortCode,
        status: "COMPLETED", // Ready for admin approval
        amount: campaignData.payout_per_lead,
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: "Conversion confirmed" });
  } catch (error) {
    console.error("Confirm conversion error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
