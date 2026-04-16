import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";

export const getInfluencerWallet = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const influencersRef = adminDb.collection("influencers");
      const influencerQuery = await influencersRef.where("userId", "==", req.user!.id).limit(1).get();
      
      if (influencerQuery.empty) return res.status(404).json({ error: "Influencer not found" });
      
      const influencerDoc = influencerQuery.docs[0];
      const influencerData = influencerDoc.data();
      
      const userSnap = await adminDb.collection("users").doc(req.user!.id).get();
      const userData = userSnap.data();

      const transactionsSnap = await adminDb.collection("transactions")
        .where("userId", "==", req.user!.id)
        .orderBy("createdAt", "desc")
        .limit(10)
        .get();
      
      const transactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      res.json({ 
        influencer: { ...influencerData, user: { name: userData?.name } }, 
        transactions 
      });
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json({ 
          influencer: { userId: req.user!.id, followers: 0, walletBalance: 0, user: { name: req.user!.email?.split('@')[0] || "Influencer" } }, 
          transactions: [] 
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Get influencer wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getInfluencers = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const influencersSnap = await adminDb.collection("influencers").get();
      const influencers = await Promise.all(influencersSnap.docs.map(async (doc) => {
        const data = doc.data();
        const userSnap = await adminDb.collection("users").doc(data.userId).get();
        const userData = userSnap.data();
        return {
          id: doc.id,
          ...data,
          user: { name: userData?.name, email: userData?.email }
        };
      }));
      res.json(influencers);
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json([]);
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Fetch influencers error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
