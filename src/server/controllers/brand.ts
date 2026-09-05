import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import { initializeTransaction, verifyTransaction } from "../utils/paystack";
import admin from "firebase-admin";

export const getBrandWallet = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const brandsRef = adminDb.collection("brands");
      const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
      
      if (brandQuery.empty) {
        const userSnap = await adminDb.collection("users").doc(req.user!.id).get();
        const userName = userSnap.exists ? (userSnap.data()?.name || "Brand Store") : "Brand Store";
        const newBrand = {
          userId: req.user!.id,
          companyName: userName,
          balance: 50000,
          subscriptionStatus: "active",
          createdAt: new Date().toISOString()
        };
        await brandsRef.add(newBrand);
        return res.json({ balance: 50000, companyName: userName });
      }
      
      const brandData = brandQuery.docs[0].data();
      res.json({ balance: brandData.balance, companyName: brandData.companyName });
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json({ balance: 50000, companyName: "Brand (Permissions Pending)" });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Get brand wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const initializeActivation = async (req: AuthRequest, res: Response) => {
  const fee = 10000;
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(req.user!.id).get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });
    const user = userDoc.data();

    const reference = `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const paystackResponse = await initializeTransaction(user!.email, fee, reference);

    await adminDb.collection("transactions").add({
      userId: userDoc.id,
      type: "SUBSCRIPTION",
      amount: fee,
      reference,
      status: "PENDING",
      createdAt: new Date().toISOString()
    });

    res.json(paystackResponse.data);
  } catch (error) {
    console.error("Initialize activation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const subscribeBrand = async (req: AuthRequest, res: Response) => {
  const fee = 10000;
  const { reference } = req.body;
  try {
    const adminDb = getAdminDb();
    const brandsRef = adminDb.collection("brands");
    const brandQuery = await brandsRef.where("userId", "==", req.user!.id).limit(1).get();
    
    if (brandQuery.empty) return res.status(404).json({ error: "Brand not found" });
    
    const brandDoc = brandQuery.docs[0];
    const brandData = brandDoc.data();

    if (reference) {
      // Direct Pay via Paystack reference
      const verification = await verifyTransaction(reference);
      if (verification.status !== true || verification.data.status !== "success") {
        return res.status(400).json({ error: "Payment verification failed" });
      }
      
      const paidAmount = verification.data.amount / 100;
      if (paidAmount < fee) {
        return res.status(400).json({ error: "Insufficient payment amount" });
      }

      await adminDb.runTransaction(async (transaction) => {
        transaction.update(brandDoc.ref, {
          subscriptionStatus: "active"
        });
        
        const adminWalletRef = adminDb.collection("admin_wallets").doc("main");
        transaction.update(adminWalletRef, {
          totalEarnings: admin.firestore.FieldValue.increment(fee),
          subscriptionRevenue: admin.firestore.FieldValue.increment(fee),
          updatedAt: new Date().toISOString()
        });
      });
      
      return res.json({ success: true });
    }

    // Fallback: Charge from existing Campaign Funds balance
    if (brandData.balance < fee) {
      return res.status(400).json({ error: "Insufficient balance for subscription. Please use the 'Pay Monthly Fee' button to pay via card." });
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
    try {
      let brandsSnap = await adminDb.collection("brands").get();

      // If user has BRAND role and has no brand document yet, create one
      if (req.user && req.user.role === "BRAND") {
        const userHasBrand = brandsSnap.docs.some(d => d.data().userId === req.user!.id);
        if (!userHasBrand) {
          const userSnap = await adminDb.collection("users").doc(req.user.id).get();
          const userName = userSnap.exists ? (userSnap.data()?.name || "Brand Store") : "Brand Store";
          await adminDb.collection("brands").add({
            userId: req.user.id,
            companyName: userName,
            balance: 50000,
            subscriptionStatus: "active",
            createdAt: new Date().toISOString()
          });
          brandsSnap = await adminDb.collection("brands").get();
        }
      }

      const brands = await Promise.all(brandsSnap.docs.map(async (doc) => {
        const data = doc.data();
        const userSnap = await adminDb.collection("users").doc(data.userId).get();
        return {
          id: doc.id,
          ...data,
          user: userSnap.exists ? userSnap.data() : null
        };
      }));

      if (brands.length === 0 && req.user?.role === "BRAND") {
        return res.json([{
          id: "brand-" + req.user.id,
          userId: req.user.id,
          companyName: req.user.email?.split("@")[0] || "My Brand Store",
          balance: 50000,
          subscriptionStatus: "active"
        }]);
      }

      res.json(brands);
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json([{
          id: "brand-" + (req.user?.id || "fallback"),
          userId: req.user?.id || "fallback",
          companyName: req.user?.email?.split("@")[0] || "My Brand Store",
          balance: 50000,
          subscriptionStatus: "active"
        }]);
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Fetch brands error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
