import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  getDocFromServer, 
  serverTimestamp,
  initializeFirestore
} from "firebase/firestore";
import firebaseConfig from "@/firebase-applet-config.json";

// Initialize Firebase
console.log("Initializing Firebase with Project ID:", firebaseConfig.projectId);
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use initializeFirestore with settings to enable long polling for stable connection in iframes/sandboxes
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Auth Providers
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
let isLoggingIn = false;
export const loginWithGoogle = async () => {
  if (isLoggingIn) return;
  isLoggingIn = true;
  try {
    return await signInWithPopup(auth, googleProvider);
  } finally {
    isLoggingIn = false;
  }
};
export const logout = () => signOut(auth);
export const registerWithEmail = (email: string, pass: string) => createUserWithEmailAndPassword(auth, email, pass);
export const loginWithEmail = (email: string, pass: string) => signInWithEmailAndPassword(auth, email, pass);

// Connection Test
async function testConnection() {
    try {
      console.log("Testing Firestore connection...");
      // Force a small timeout to avoid long hangs
      // Check two common locations in case rules are restrictive
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (e: any) {
        if (e.message?.includes('permission-denied') || e.code === 'permission-denied') {
          console.log("Firestore connection check (Public Test) failed with permission-denied (Expected if rules are locked).");
        } else {
          await getDocFromServer(doc(db, 'users', 'test', 'connection'));
        }
      }
      console.log("Firestore connection successful");
    } catch (error: any) {
    console.error("Firestore connectivity diagnostic:");
    console.error("- Code:", error.code);
    console.error("- Message:", error.message);
    if (error.message.includes('the client is offline') || error.code === 'unavailable') {
      console.error("ENVIRONMENT ALERT: Firestore backend unreachable from this browser session. This may be due to network restrictions or incorrect Project ID.");
    }
  }
}
testConnection();
