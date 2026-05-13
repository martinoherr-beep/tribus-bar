import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCsFW-Vk1pIowTcSHh_665Jv4SrAxYH0bo",
  authDomain: "tribusbar-ebece.firebaseapp.com",
  projectId: "tribusbar-ebece",
  storageBucket: "tribusbar-ebece.firebasestorage.app",
  messagingSenderId: "1067691570980",
  appId: "1:1067691570980:web:77569c6e326e66d17865b1"
};

// 1. Primero definimos e inicializamos la APP
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. Ahora que 'app' existe, inicializamos y exportamos los servicios
export const db = getFirestore(app);
export const auth = getAuth(app);