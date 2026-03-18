import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBbnYjzsQDzTBpvLG_I6hzGEhFJR0pH_TM",
  authDomain: "hello-doctor-srsoft.firebaseapp.com",
  databaseURL: "https://hello-doctor-srsoft-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hello-doctor-srsoft",
  storageBucket: "hello-doctor-srsoft.appspot.com",
  messagingSenderId: "490453154706",
  appId: "1:490453154706:web:628bb4a8a9e29e04b0df4b",
  measurementId: "G-23BKYFTL8R"
};

// Initialize Firebase only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
