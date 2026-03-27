import admin from "firebase-admin";
import firebaseConfig from "../../../firebase-applet-config.json";

let app: admin.app.App | null = null;

function getApp() {
  if (!app) {
    if (!admin.apps.length) {
      try {
        app = admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: firebaseConfig.projectId,
        });
      } catch (error) {
        console.warn("Failed to initialize Firebase Admin with applicationDefault credentials. Falling back to project ID only.");
        // Fallback for environments without default credentials (like local dev without service account)
        // Note: This might limit some functionality like Auth verification if not properly configured.
        app = admin.initializeApp({
          projectId: firebaseConfig.projectId,
        });
      }
    } else {
      app = admin.apps[0]!;
    }
  }
  return app;
}

export const getAdminAuth = () => getApp().auth();
export const getAdminDb = () => {
  const firestore = getApp().firestore();
  // If a specific database ID is provided in the config, use it.
  // Note: In newer firebase-admin versions, you can pass the databaseId to firestore()
  if (firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)") {
    try {
      // @ts-ignore - databaseId might not be in the types but is supported in newer versions
      return getApp().firestore(firebaseConfig.firestoreDatabaseId);
    } catch (e) {
      return firestore;
    }
  }
  return firestore;
};

export default admin;
