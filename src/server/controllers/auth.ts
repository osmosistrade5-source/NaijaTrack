import { Request, Response } from "express";
import { getAdminAuth, getAdminDb } from "../config/firebase-admin";
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
      const isPermissionError = dbError.code === 7 || 
                               dbError.message?.includes("PERMISSION_DENIED") ||
                               dbError.message?.includes("Missing or insufficient permissions");
      
      if (isPermissionError) {
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

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const assignedRole = (role === "BRAND" || role === "ADMIN") ? role : "INFLUENCER";
    const displayName = name?.trim() || (assignedRole === "BRAND" ? "Brand Partner" : "Influencer Partner");
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let uid: string;
    try {
      // Create user in Firebase Auth via Admin SDK
      const userRecord = await adminAuth.createUser({
        email,
        password: password || "Password123!",
        displayName
      });
      uid = userRecord.uid;
    } catch (authError: any) {
      if (authError.code === "auth/email-already-exists") {
        const existingUser = await adminAuth.getUserByEmail(email);
        uid = existingUser.uid;
      } else {
        console.warn("Admin createUser notice, creating synthetic UID:", authError.message);
        uid = "usr_" + Buffer.from(email).toString("hex").substring(0, 20);
      }
    }

    const now = new Date().toISOString();

    // 1. Create or update user in Firestore
    try {
      await adminDb.collection("users").doc(uid).set({
        name: displayName,
        email,
        role: assignedRole,
        createdAt: now,
        updatedAt: now
      }, { merge: true });
    } catch (dbErr: any) {
      console.warn("Firestore set user notice:", dbErr.message);
    }

    // 2. Provision Brand or Influencer record in Firestore
    try {
      if (assignedRole === "BRAND") {
        const brandQuery = await adminDb.collection("brands").where("userId", "==", uid).limit(1).get();
        if (brandQuery.empty) {
          await adminDb.collection("brands").add({
            userId: uid,
            companyName: displayName,
            balance: 50000, // Initial testing balance
            subscriptionStatus: "active",
            createdAt: now
          });
        }
      } else if (assignedRole === "INFLUENCER") {
        const infQuery = await adminDb.collection("influencers").where("userId", "==", uid).limit(1).get();
        if (infQuery.empty) {
          await adminDb.collection("influencers").add({
            userId: uid,
            name: displayName,
            handle: "@" + displayName.toLowerCase().replace(/[^a-z0-9]/g, ""),
            followers: 5000,
            niche: "Lifestyle & Commerce",
            walletBalance: 0,
            createdAt: now
          });
        }
      }
    } catch (profErr: any) {
      console.warn("Profile auto-provision notice:", profErr.message);
    }

    // 3. Generate Custom Token if credentials support signing
    let customToken: string | null = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        customToken = await adminAuth.createCustomToken(uid, { role: assignedRole });
      } catch {
        // Fallback: client uses direct Firebase client auth or session tokens
      }
    }

    res.json({
      success: true,
      customToken,
      user: {
        id: uid,
        name: displayName,
        email,
        role: assignedRole
      }
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(500).json({ error: error.message || "Failed to register" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let uid: string;
    let displayName = email.split("@")[0];
    let userRole = role || "INFLUENCER";

    try {
      const userRecord = await adminAuth.getUserByEmail(email);
      uid = userRecord.uid;
      displayName = userRecord.displayName || displayName;
    } catch {
      uid = "usr_" + Buffer.from(email).toString("hex").substring(0, 20);
    }

    // Check existing role in Firestore
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.role) userRole = data.role;
        if (data?.name) displayName = data.name;
      } else {
        // Create if missing
        await adminDb.collection("users").doc(uid).set({
          name: displayName,
          email,
          role: userRole,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      }
    } catch (err: any) {
      console.warn("Firestore login lookup notice:", err.message);
    }

    let customToken: string | null = null;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        customToken = await adminAuth.createCustomToken(uid, { role: userRole });
      } catch {
        // Fallback: client uses direct Firebase client auth or session tokens
      }
    }

    res.json({
      success: true,
      customToken,
      user: {
        id: uid,
        name: displayName,
        email,
        role: userRole
      }
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Failed to login" });
  }
};

export const syncProfile = async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const { role, name } = req.body;
    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    let uid = "";
    let email = "";
    let displayName = name || "";

    if (token && !token.startsWith("demo-")) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        uid = decoded.uid;
        email = decoded.email || "";
        displayName = displayName || decoded.name || email.split("@")[0] || "User";
      } catch (err: any) {
        console.warn("Token verification fallback in syncProfile:", err.message);
      }
    }

    if (!uid && req.body.uid) {
      uid = req.body.uid;
      email = req.body.email || `${uid}@naijatrack.ng`;
      displayName = displayName || email.split("@")[0];
    }

    if (!uid) {
      return res.status(401).json({ error: "Unauthorized: Missing user identity" });
    }

    const assignedRole = (role === "BRAND" || role === "ADMIN") ? role : "INFLUENCER";
    const now = new Date().toISOString();

    // Check / update user
    let finalRole = assignedRole;
    try {
      const userDoc = await adminDb.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (data?.role) finalRole = data.role;
      } else {
        await adminDb.collection("users").doc(uid).set({
          name: displayName,
          email,
          role: assignedRole,
          createdAt: now,
          updatedAt: now
        });
      }
    } catch (err: any) {
      console.warn("Firestore sync notice:", err.message);
    }

    // Ensure Brand or Influencer doc exists
    try {
      if (finalRole === "BRAND") {
        const brandQuery = await adminDb.collection("brands").where("userId", "==", uid).limit(1).get();
        if (brandQuery.empty) {
          await adminDb.collection("brands").add({
            userId: uid,
            companyName: displayName + " Store",
            balance: 50000,
            subscriptionStatus: "active",
            createdAt: now
          });
        }
      } else if (finalRole === "INFLUENCER") {
        const infQuery = await adminDb.collection("influencers").where("userId", "==", uid).limit(1).get();
        if (infQuery.empty) {
          await adminDb.collection("influencers").add({
            userId: uid,
            name: displayName,
            handle: "@" + displayName.toLowerCase().replace(/[^a-z0-9]/g, ""),
            followers: 5000,
            niche: "Lifestyle & Commerce",
            walletBalance: 0,
            createdAt: now
          });
        }
      }
    } catch (profErr: any) {
      console.warn("Profile sync error:", profErr.message);
    }

    res.json({
      success: true,
      user: {
        id: uid,
        name: displayName,
        email,
        role: finalRole
      }
    });
  } catch (error: any) {
    console.error("Sync profile error:", error);
    res.status(500).json({ error: error.message || "Failed to sync profile" });
  }
};

export const demoLogin = async (req: Request, res: Response) => {
  try {
    const { role } = req.body;
    const assignedRole = (role === "BRAND" || role === "ADMIN") ? role : "INFLUENCER";
    const adminDb = getAdminDb();
    const now = new Date().toISOString();

    let uid = "";
    let displayName = "";
    let email = "";

    if (assignedRole === "BRAND") {
      uid = "demo-brand-konga";
      displayName = "Konga Fashion Store";
      email = "brand@konga.com";
    } else if (assignedRole === "ADMIN") {
      uid = "demo-admin";
      displayName = "NaijaTrack Admin";
      email = "osmosistrade5@gmail.com";
    } else {
      uid = "demo-influencer-tunde";
      displayName = "Tunde Ednut";
      email = "tunde@influencer.ng";
    }

    // Seed in Firestore
    try {
      await adminDb.collection("users").doc(uid).set({
        name: displayName,
        email,
        role: assignedRole,
        createdAt: now,
        updatedAt: now
      }, { merge: true });

      if (assignedRole === "BRAND") {
        const brandQuery = await adminDb.collection("brands").where("userId", "==", uid).limit(1).get();
        if (brandQuery.empty) {
          await adminDb.collection("brands").add({
            userId: uid,
            companyName: displayName,
            balance: 150000,
            subscriptionStatus: "active",
            createdAt: now
          });
        }
      } else if (assignedRole === "INFLUENCER") {
        const infQuery = await adminDb.collection("influencers").where("userId", "==", uid).limit(1).get();
        if (infQuery.empty) {
          await adminDb.collection("influencers").add({
            userId: uid,
            name: displayName,
            handle: "@tundeednut",
            followers: 4200000,
            niche: "Entertainment & Deals",
            walletBalance: 24500,
            createdAt: now
          });
        }
      }
    } catch (err: any) {
      console.warn("Demo account seeding notice:", err.message);
    }

    res.json({
      success: true,
      token: `demo-${assignedRole.toLowerCase()}-${uid}`,
      user: {
        id: uid,
        name: displayName,
        email,
        role: assignedRole
      }
    });
  } catch (error: any) {
    console.error("Demo login error:", error);
    res.status(500).json({ error: "Failed to create demo session" });
  }
};

