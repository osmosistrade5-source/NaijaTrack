import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import { z } from "zod";
import admin from "firebase-admin";

const campaignSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  budget: z.number().positive(),
});

export const createCampaign = async (req: AuthRequest, res: Response) => {
  const result = campaignSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues });
  }

  const { title, description, budget } = result.data;

  try {
    const adminDb = getAdminDb();
    const brandsRef = adminDb.collection("brands");
    const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
    
    if (brandQuery.empty) {
      return res.status(404).json({ error: "Brand profile not found" });
    }

    const brandDoc = brandQuery.docs[0];
    const brandData = brandDoc.data();

    if (brandData.balance < budget) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    const campaignRef = adminDb.collection("campaigns").doc();
    
    await adminDb.runTransaction(async (transaction) => {
      transaction.update(brandDoc.ref, {
        balance: admin.firestore.FieldValue.increment(-budget)
      });
      
      transaction.set(campaignRef, {
        brandId: brandDoc.id,
        title,
        description,
        budget,
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      });
    });

    res.status(201).json({ id: campaignRef.id, title, description, budget, status: "ACTIVE" });
  } catch (error) {
    console.error("Campaign creation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getCampaigns = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const campaignsSnap = await adminDb.collection("campaigns").get();
      const campaigns = await Promise.all(campaignsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const brandSnap = await adminDb.collection("brands").doc(data.brandId).get();
        return {
          id: doc.id,
          ...data,
          brand: brandSnap.exists ? brandSnap.data() : null
        };
      }));
      res.json(campaigns);
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json([]);
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Fetch campaigns error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
