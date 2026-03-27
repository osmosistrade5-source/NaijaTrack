import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    const userDoc = await adminDb.collection("users").doc(req.user!.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    const user = userDoc.data();
    res.json({ user: { id: userDoc.id, ...user } });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
