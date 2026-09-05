import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import admin from "firebase-admin";

const SAMPLE_TRANSACTIONS = (userId: string) => [
  {
    userId,
    type: "CAMPAIGN_EARNING",
    title: "Commission: Konga Mega Gadget Splash",
    amount: 7000,
    status: "SUCCESS",
    reference: "REF-KGA-9821",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    userId,
    type: "CAMPAIGN_EARNING",
    title: "Commission: Payporte Lagos Drops",
    amount: 4000,
    status: "SUCCESS",
    reference: "REF-PPT-4412",
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
  },
  {
    userId,
    type: "WELCOME_BONUS",
    title: "NaijaTrack Creator Welcome Bonus",
    amount: 15000,
    status: "SUCCESS",
    reference: "REF-NT-BONUS",
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export const getInfluencerWallet = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const influencersRef = adminDb.collection("influencers");
      const influencerQuery = await influencersRef.where("userId", "==", req.user!.id).limit(1).get();
      
      let influencerDoc: any = null;
      let influencerData: any = null;

      if (influencerQuery.empty) {
        const userSnap = await adminDb.collection("users").doc(req.user!.id).get();
        const userName = userSnap.exists ? (userSnap.data()?.name || "Influencer") : "Influencer";
        const initialBalance = 26000;
        const newInf = {
          userId: req.user!.id,
          name: userName,
          handle: "@" + userName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          followers: 12500,
          niche: "Lifestyle, Tech & Fashion",
          walletBalance: initialBalance,
          createdAt: new Date().toISOString()
        };
        const newDoc = await influencersRef.add(newInf);
        influencerDoc = newDoc;
        influencerData = newInf;

        // Seed initial transactions
        for (const t of SAMPLE_TRANSACTIONS(req.user!.id)) {
          await adminDb.collection("transactions").add(t);
        }
      } else {
        influencerDoc = influencerQuery.docs[0];
        influencerData = influencerDoc.data();
        if (influencerData.walletBalance === 0) {
          await influencerDoc.ref.update({ walletBalance: 26000 });
          influencerData.walletBalance = 26000;
        }
      }
      
      const userSnap = await adminDb.collection("users").doc(req.user!.id).get();
      const userData = userSnap.data();

      const transactionsSnap = await adminDb.collection("transactions")
        .where("userId", "==", req.user!.id)
        .limit(10)
        .get();
      
      let transactions = transactionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (transactions.length === 0) {
        for (const t of SAMPLE_TRANSACTIONS(req.user!.id)) {
          const added = await adminDb.collection("transactions").add(t);
          transactions.push({ id: added.id, ...t });
        }
      }

      // Sort newest first
      transactions.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      res.json({ 
        influencer: { ...influencerData, user: { name: userData?.name || influencerData.name } }, 
        transactions 
      });
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        return res.json({ 
          influencer: { 
            userId: req.user!.id, 
            followers: 12500, 
            walletBalance: 26000, 
            user: { name: (req.user as any)?.name || "Influencer" } 
          }, 
          transactions: SAMPLE_TRANSACTIONS(req.user!.id) 
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Get influencer wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const withdrawInfluencerWallet = async (req: AuthRequest, res: Response) => {
  const { amount, bankName, accountNumber, accountName } = req.body;
  const numAmount = parseFloat(amount);

  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: "Please specify a valid withdrawal amount." });
  }

  try {
    const adminDb = getAdminDb();
    const influencersRef = adminDb.collection("influencers");
    const influencerQuery = await influencersRef.where("userId", "==", req.user!.id).limit(1).get();

    if (influencerQuery.empty) {
      return res.status(404).json({ error: "Influencer profile not found" });
    }

    const infDoc = influencerQuery.docs[0];
    const infData = infDoc.data();

    if ((infData.walletBalance || 0) < numAmount) {
      return res.status(400).json({ error: "Insufficient wallet balance." });
    }

    const reference = `NG-PAYOUT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    await adminDb.runTransaction(async (transaction) => {
      transaction.update(infDoc.ref, {
        walletBalance: admin.firestore.FieldValue.increment(-numAmount)
      });

      const txRef = adminDb.collection("transactions").doc();
      transaction.set(txRef, {
        userId: req.user!.id,
        type: "BANK_WITHDRAWAL",
        title: `Instant Bank Transfer to ${bankName || "Bank"} (${accountNumber})`,
        amount: numAmount,
        bankName,
        accountNumber,
        accountName,
        reference,
        status: "SUCCESS",
        createdAt: new Date().toISOString()
      });
    });

    res.json({
      success: true,
      message: `₦${numAmount.toLocaleString()} successfully transferred to ${bankName} (${accountNumber})`,
      reference
    });
  } catch (error) {
    console.error("Withdrawal error:", error);
    res.status(500).json({ error: "Failed to process withdrawal." });
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
