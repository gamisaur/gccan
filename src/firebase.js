import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDCIQXgtFEE19FaValx7UNk0Y3m3TbqWJs",
  authDomain: "gccan-1.firebaseapp.com",
  databaseURL: "https://gccan-1-default-rtdb.firebaseio.com",
  projectId: "gccan-1",
  storageBucket: "gccan-1.firebasestorage.app",
  messagingSenderId: "443700159443",
  appId: "1:443700159443:web:999dd800d977304946c526",
  measurementId: "G-S4PWVNQBF8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const rtdb = getDatabase(app);

export { db, rtdb };
export const auth = getAuth(app);
