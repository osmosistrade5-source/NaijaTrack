import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

async function testAdminAccess() {
  console.log("Testing Firestore Admin access...");
  console.log("Project ID:", firebaseConfig.projectId);
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  }
  
  const db = getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId);
  
  try {
    console.log(`Attempting to read 'users' collection from ${firebaseConfig.firestoreDatabaseId}...`);
    const snapshot = await db.collection("users").limit(1).get();
    console.log("Read successful! Found", snapshot.size, "documents.");
  } catch (error: any) {
    console.error("Read failed:", error.message || error);
  }

  try {
    console.log("Attempting to write to 'test_access' collection...");
    await db.collection("test_access").add({
      timestamp: new Date().toISOString(),
      message: "Admin SDK test"
    });
    console.log("Write successful!");
  } catch (error: any) {
    console.error("Write failed:", error.message || error);
  }
}

testAdminAccess();
