import { initializeApp } from "firebase/app";
import { getDatabase, ref, update } from "firebase/database";

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
const db = getDatabase(app);

const username = process.argv[2] || "admin";
const newPassword = process.argv[3];

if (!newPassword) {
  console.log("--------------------------------------------------");
  console.log("Toko-KU Password Reset Utility");
  console.log("Usage: npm run reset-admin -- <newPassword>");
  console.log("--------------------------------------------------");
  process.exit(1);
}

const userRef = ref(db, `users/${username}`);

console.log(`Updating password for user: ${username}...`);

update(userRef, { password: newPassword })
  .then(() => {
    console.log("--------------------------------------------------");
    console.log(`SUCCESS: Password for '${username}' updated!`);
    console.log(`New password: ${newPassword}`);
    console.log("--------------------------------------------------");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILED to update password:", err.message);
    process.exit(1);
  });
