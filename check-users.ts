import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

async function checkUsers() {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: firebaseConfig.projectId
    });
  }
  
  const auth = admin.auth();
  const db = getFirestore(admin.apps[0]!, firebaseConfig.firestoreDatabaseId);

  console.log("--- Firebase Auth Users ---");
  try {
    const authUsers = await auth.listUsers();
    authUsers.users.forEach(user => {
      console.log(`Auth User: ${user.email} (UID: ${user.uid})`);
    });
    if (authUsers.users.length === 0) console.log("No users in Firebase Auth.");
  } catch (error: any) {
    console.error("Failed to list Auth users:", error.message);
  }

  console.log("\n--- Firestore 'users' Collection ---");
  try {
    const snapshot = await db.collection("users").get();
    snapshot.forEach(doc => {
      console.log(`Firestore User: ${doc.data().email} (ID: ${doc.id})`);
    });
    if (snapshot.empty) console.log("No users in Firestore 'users' collection.");
  } catch (error: any) {
    console.error("Failed to list Firestore users:", error.message);
  }
}

checkUsers();
