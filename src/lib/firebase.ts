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
    
    const testDoc = doc(db, 'test', 'connection');
    await getDocFromServer(testDoc).catch(() => {
      return getDoc(testDoc);
    });
    console.log("Firestore connection stabilized");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore client is offline or initializing.");
    }
  }
}
testConnection();
