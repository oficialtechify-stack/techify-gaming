import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import config from '../../firebase-applet-config.json';

export const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || config.apiKey || "AIzaSyBZY9m-CFG7-l9H1bptd4eGcd6IL_aEWIM",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || "techify-gaming-106fe.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || config.projectId || "techify-gaming-106fe",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || "techify-gaming-106fe.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "247058420839",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || config.appId || "1:247058420839:web:436355c69a6026be9b70c2",
  measurementId: (import.meta as any).env?.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || "G-3SB1FEBFNZ"
};

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
