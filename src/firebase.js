import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCJyZCkZ8Umr7XzdY1Ybph8JrCbrRb7f0o",
  authDomain: "my-smart-dashboard-eeed1.firebaseapp.com",
  databaseURL: "https://my-smart-dashboard-eeed1-default-rtdb.firebaseio.com",
  projectId: "my-smart-dashboard-eeed1",
  storageBucket: "my-smart-dashboard-eeed1.firebasestorage.app",
  messagingSenderId: "987713018754",
  appId: "1:987713018754:web:8313ee27d5c1a034758d9b",
  measurementId: "G-TGGNTEQH8H"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);

// Inisialisasi layanan Firestore untuk digunakan di App.jsx
export const db = getFirestore(app);