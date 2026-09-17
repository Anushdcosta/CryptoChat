import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "cryptochat-508915",
  appId: "1:451500121141:web:85bba0afbea9834a33e57c",
  storageBucket: "cryptochat-508915.firebasestorage.app",
  apiKey: "AIzaSyDrntdvgdP-F0EMuVOkYwQdLuuPzPrqE1Y",
  authDomain: "cryptochat-508915.firebaseapp.com",
  messagingSenderId: "451500121141",
  measurementId: "G-WMCJ6EK97V",
  projectNumber: "451500121141"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
