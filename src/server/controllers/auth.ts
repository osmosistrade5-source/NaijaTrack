import { Response } from "express";
import { getAdminDb } from "../config/firebase-admin";
import { AuthRequest } from "../middleware/auth";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const adminDb = getAdminDb();
    try {
      const userDoc = await adminDb.collection("users").doc(req.user!.id).get();
      
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }
      const user = userDoc.data();
      res.json({ user: { id: userDoc.id, ...user } });
    } catch (dbError: any) {
      if (dbError.code === 7 || dbError.message?.includes("PERMISSION_DENIED")) {
        console.warn("Permission denied to Firestore in getProfile, using request user info.");
        return res.json({ 
          user: { 
            id: req.user!.id, 
            name: req.user!.email?.split('@')[0] || "User",
            email: req.user!.email,
            role: req.user!.role 
          } 
        });
      }
      throw dbError;
    }
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
