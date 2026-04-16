import { Request, Response, NextFunction } from "express";
import { getAdminAuth, getAdminDb } from "../config/firebase-admin";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    email?: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Fetch user role from Firestore
    try {
      const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      req.user = {
        id: decodedToken.uid,
        role: userData?.role || "INFLUENCER",
        email: decodedToken.email
      };
      
      next();
    } catch (dbError: any) {
      const isPermissionError = dbError.code === 7 || 
                               dbError.message?.includes("PERMISSION_DENIED") ||
                               dbError.message?.includes("Missing or insufficient permissions");
      
      if (isPermissionError) {
        console.warn(`Permission denied to Firestore (DB: ${adminDb.databaseId}), using default role for authenticated user.`);
        req.user = {
          id: decodedToken.uid,
          role: "INFLUENCER", // Default fallback
          email: decodedToken.email
        };
        return next();
      }
      
      console.error(`Firestore access error (DB: ${adminDb.databaseId}):`, dbError.message || dbError);
      throw dbError;
    }
  } catch (error) {
    console.error("Auth error:", error);
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
};
