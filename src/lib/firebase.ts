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
// experimentalForceLongPolling and useFetchStreams: false are common fixes for proxy/firewall issues.
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  ignoreUndefinedProperties: true,
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

// Connection Test - Minimal and non-blocking
async function testConnection() {
    try {
      // Small delay to allow transport to warm up
      await new Promise(r => setTimeout(r, 500));
      
      const testDoc = doc(db, 'users', 'connection-test');
      await getDocFromServer(testDoc).catch(() => {
          // If server call fails, fallback to standard get (might use cache)
          return getDoc(testDoc);
      });
      
      console.log("Firestore connection stabilized");
    } catch (error: any) {
    if (error.message.includes('the client is offline') || error.code === 'unavailable') {
      console.warn("Firestore is operating in Offline/Cached mode. This is often normal during initial load in sandboxed environments.");
    } else if (!error.message.includes('permission-denied')) {
      console.error("Firestore connectivity notice:", error.message);
    }
  }
}
testConnection();
