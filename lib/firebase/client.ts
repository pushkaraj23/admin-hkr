import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseBrowserConfig, isFirebaseConfigured } from "@/lib/firebase/config";

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* variables to .env.local (see .env.example).",
    );
  }
  const cfg = {
    apiKey: firebaseBrowserConfig.apiKey!,
    authDomain: firebaseBrowserConfig.authDomain!,
    projectId: firebaseBrowserConfig.projectId!,
    storageBucket: firebaseBrowserConfig.storageBucket,
    messagingSenderId: firebaseBrowserConfig.messagingSenderId,
    appId: firebaseBrowserConfig.appId!,
    measurementId: firebaseBrowserConfig.measurementId,
  };
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }
  return initializeApp(cfg);
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseApp());
}

export function getFirebaseDb() {
  return getFirestore(getFirebaseApp());
}
