import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const adminWalletSnap = await adminDb.collection("admin_wallets").doc("main").get();
    const adminWallet = adminWalletSnap.exists ? adminWalletSnap.data() : null;
    
    const totalUsers = (await adminDb.collection("users").get()).size;
    const totalBrands = (await adminDb.collection("brands").get()).size;
    const totalInfluencers = (await adminDb.collection("influencers").get()).size;
    const totalCampaigns = (await adminDb.collection("campaigns").get()).size;
    const totalPayments = (await adminDb.collection("payments").get()).size;

    res.json({
      adminWallet,
      totalUsers,
      totalBrands,
      totalInfluencers,
      totalCampaigns,
      totalPayments,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllUsers = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const usersSnap = await adminDb.collection("users").get();
    const users = await Promise.all(usersSnap.docs.map(async (doc) => {
      const data = doc.data();
      const brandQuery = await adminDb.collection("brands").where("userId", "==", doc.id).limit(1).get();
      const influencerQuery = await adminDb.collection("influencers").where("userId", "==", doc.id).limit(1).get();
      
      return {
        id: doc.id,
        ...data,
        brand: !brandQuery.empty ? brandQuery.docs[0].data() : null,
        influencer: !influencerQuery.empty ? influencerQuery.docs[0].data() : null
      };
    }));
    res.json(users);
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const transactionsSnap = await adminDb.collection("transactions").get();
    const transactions = await Promise.all(transactionsSnap.docs.map(async (doc) => {
      const data = doc.data();
      const userSnap = await adminDb.collection("users").doc(data.userId).get();
      return {
        id: doc.id,
        ...data,
        user: userSnap.exists ? userSnap.data() : null
      };
    }));
    res.json(transactions);
  } catch (error) {
    console.error("Fetch transactions error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
