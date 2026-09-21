import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import config from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || config.apiKey || "AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM",
  authDomain: "www.techify.sbs",
  projectId: "techify-gaming-106fe",
  storageBucket: "techify-gaming-106fe.firebasestorage.app",
  messagingSenderId: "247058420839",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || config.appId || "1:247058420839:web:436355c69a6026be9b70c2",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || "G-3SB1FEBFNZ"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Erro no login:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

export default app;
