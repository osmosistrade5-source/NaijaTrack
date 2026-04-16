import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../../firebase-applet-config.json";

let app: admin.app.App | null = null;

function getApp() {
  if (!app) {
    if (!admin.apps.length) {
      app = admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
      console.log(`Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
    } else {
      app = admin.apps[0]!;
    }
  }
  return app;
}

export const getAdminAuth = () => getApp().auth();

export const getAdminDb = (databaseId?: string) => {
  const currentApp = getApp();
  // Use the explicitly provided ID, or the one from config
  const dbId = databaseId || firebaseConfig.firestoreDatabaseId;
  
  const finalDbId = (dbId === "(default)" || !dbId) ? undefined : dbId;
  console.log(`Getting Admin DB instance for ID: ${finalDbId || "(default)"}`);
  
  return getFirestore(currentApp, finalDbId);
};

export default admin;
