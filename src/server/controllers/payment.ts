import { Request, Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";
import { initializeTransaction, verifyTransaction } from "../utils/paystack";
import admin from "firebase-admin";

export const fundWallet = async (req: AuthRequest, res: Response) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(req.user!.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userDoc.data();

    const reference = `NT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const paystackResponse = await initializeTransaction(user!.email, amount, reference);

    await adminDb.collection("transactions").add({
      userId: userDoc.id,
      type: "DEPOSIT",
      amount,
      reference,
      status: "PENDING",
      createdAt: new Date().toISOString()
    });

    res.json(paystackResponse.data);
  } catch (error) {
    console.error("Fund wallet error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const paystackWebhook = async (req: Request, res: Response) => {
  const { event, data } = req.body;

  if (event === "charge.success") {
    const { reference, amount } = data;
    const actualAmount = amount / 100;

    try {
      const adminDb = getAdminDb();
      const transactionsRef = adminDb.collection("transactions");
      const transactionQuery = await transactionsRef.where("reference", "==", reference).limit(1).get();
      
      if (!transactionQuery.empty) {
        const transactionDoc = transactionQuery.docs[0];
        const transactionData = transactionDoc.data();

        if (transactionData.status === "PENDING") {
          await adminDb.runTransaction(async (transaction) => {
            transaction.update(transactionDoc.ref, { status: "SUCCESS" });

            const userDoc = await adminDb.collection("users").doc(transactionData.userId).get();
            const userData = userDoc.data();

            if (userData?.role === "BRAND") {
              const brandsRef = adminDb.collection("brands");
              const brandQuery = await brandsRef.where("userId", "==", transactionData.userId).limit(1).get();
              if (!brandQuery.empty) {
                transaction.update(brandQuery.docs[0].ref, {
                  balance: admin.firestore.FieldValue.increment(actualAmount)
                });
              }
            }
          });
        }
      }
    } catch (error) {
      console.error("Webhook error:", error);
    }
  }

  res.sendStatus(200);
};

export const payoutInfluencer = async (req: AuthRequest, res: Response) => {
  const { taskId } = req.body;

  try {
    const adminDb = getAdminDb();
    // Using collectionGroup to find task by ID regardless of campaignId
    const taskQuery = await adminDb.collectionGroup("tasks").where(admin.firestore.FieldPath.documentId(), "==", taskId).limit(1).get();
    
    if (taskQuery.empty) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    const taskDoc = taskQuery.docs[0];
    const taskData = taskDoc.data();

    if (taskData.status !== "COMPLETED") {
      return res.status(400).json({ error: "Task not completed" });
    }

    const campaignDoc = await adminDb.collection("campaigns").doc(taskData.campaignId).get();
    const campaignData = campaignDoc.data();

    const payoutAmount = campaignData?.budget || 0; 
    const platformFee = payoutAmount * 0.07;
    const influencerAmount = payoutAmount - platformFee;

    await adminDb.runTransaction(async (transaction) => {
      transaction.update(taskDoc.ref, { status: "APPROVED" });

      const influencersRef = adminDb.collection("influencers");
      const influencerQuery = await influencersRef.where("userId", "==", taskData.influencerId).limit(1).get();
      if (!influencerQuery.empty) {
        transaction.update(influencerQuery.docs[0].ref, {
          walletBalance: admin.firestore.FieldValue.increment(influencerAmount)
        });
      }

      const adminWalletRef = adminDb.collection("admin_wallets").doc("main");
      transaction.update(adminWalletRef, {
        totalEarnings: admin.firestore.FieldValue.increment(platformFee),
        commissionRevenue: admin.firestore.FieldValue.increment(platformFee),
        updatedAt: new Date().toISOString()
      });

      const paymentRef = adminDb.collection("payments").doc();
      transaction.set(paymentRef, {
        brandId: campaignData?.brandId,
        influencerId: taskData.influencerId,
        amount: payoutAmount,
        platformFee: 0.07,
        status: "completed",
        createdAt: new Date().toISOString()
      });
    });

    res.json({ success: true, message: "Payout successful" });
  } catch (error) {
    console.error("Payout error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
