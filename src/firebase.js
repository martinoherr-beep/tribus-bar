import { initializeApp, getApps, getApp } from "firebase/app"; // <-- Asegúrate de que diga esto
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCsFW-Vk1pIowTcSHh_665Jv4SrAxYH0bo",
  authDomain: "tribusbar-ebece.firebaseapp.com",
  projectId: "tribusbar-ebece",
  storageBucket: "tribusbar-ebece.firebasestorage.app",
  messagingSenderId: "1067691570980",
  appId: "1:1067691570980:web:77569c6e326e66d17865b1"
};

// VALIDACIÓN: Si no hay apps, inicializa. Si ya hay, usa la existente.
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);