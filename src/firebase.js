import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC485OlKQwRshd5wSqhFxuRe-ZSkOTJdIM",
  authDomain: "paymentgateway-173a4.firebaseapp.com",
  databaseURL: "https://paymentgateway-173a4-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "paymentgateway-173a4",
  storageBucket: "paymentgateway-173a4.firebasestorage.app",
  messagingSenderId: "696883557515",
  appId: "1:696883557515:web:38c62faa85183b7a48908e"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
