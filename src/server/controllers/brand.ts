import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import admin from "firebase-admin";

export const getBrandWallet = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const brandsRef = adminDb.collection("brands");
    const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
    
    if (brandQuery.empty) return res.status(404).json({ error: "Brand not found" });
    
    const brandData = brandQuery.docs[0].data();
    res.json({ balance: brandData.balance, companyName: brandData.companyName });
  } catch (error) {
    console.error("Get brand wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const subscribeBrand = async (req: AuthRequest, res: Response) => {
  const fee = 15000;
  try {
    const adminDb = getAdminDb();
    const brandsRef = adminDb.collection("brands");
    const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
    
    if (brandQuery.empty) return res.status(404).json({ error: "Brand not found" });
    
    const brandDoc = brandQuery.docs[0];
    const brandData = brandDoc.data();

    if (brandData.balance < fee) {
      return res.status(400).json({ error: "Insufficient balance for subscription" });
    }

    await adminDb.runTransaction(async (transaction) => {
      transaction.update(brandDoc.ref, {
        balance: admin.firestore.FieldValue.increment(-fee),
        subscriptionStatus: "active"
      });
      
      const adminWalletRef = adminDb.collection("admin_wallets").doc("main");
      transaction.update(adminWalletRef, {
        totalEarnings: admin.firestore.FieldValue.increment(fee),
        subscriptionRevenue: admin.firestore.FieldValue.increment(fee),
        updatedAt: new Date().toISOString()
      });
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Subscribe brand error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getBrands = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const brandsSnap = await adminDb.collection("brands").get();
    const brands = await Promise.all(brandsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const userSnap = await adminDb.collection("users").doc(data.userId).get();
      return {
        id: doc.id,
        ...data,
        user: userSnap.exists ? userSnap.data() : null
      };
    }));
    res.json(brands);
  } catch (error) {
    console.error("Fetch brands error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
