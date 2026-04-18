import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

async function testAdminAccess() {
  console.log("Testing Firestore Admin access...");
  console.log("Project ID:", firebaseConfig.projectId);
  
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
  
  // Test named database
  const dbNamed = getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId);
  // Test default database
  const dbDefault = getFirestore(admin.apps[0]!);
  
  try {
    console.log(`Attempting to read 'users' collection from NAMED DB: ${firebaseConfig.firestoreDatabaseId}...`);
    const snapshot = await dbNamed.collection("users").limit(1).get();
    console.log("NAMED DB Read successful! Found", snapshot.size, "documents.");
  } catch (error: any) {
    console.error("NAMED DB Read failed:", error.message || error);
  }

  try {
    console.log("Attempting to read 'users' collection from DEFAULT DB...");
    const snapshot = await dbDefault.collection("users").limit(1).get();
    console.log("DEFAULT DB Read successful! Found", snapshot.size, "documents.");
  } catch (error: any) {
    console.error("DEFAULT DB Read failed:", error.message || error);
  }
}

testAdminAccess();
