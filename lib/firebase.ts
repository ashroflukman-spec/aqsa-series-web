import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBIOq6p-sw4eecMvtQbxhm6pZJNJOBAy9Q",
  authDomain: "aqsa-siries.firebaseapp.com",
  projectId: "aqsa-siries",
  storageBucket: "aqsa-siries.firebasestorage.app",
  messagingSenderId: "307884185077",
  appId: "1:307884185077:web:f3bdf84822f7487519bcbc",
  measurementId: "G-HPD05NBCWN",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };