import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA6PZUNXvTHDsW97H1cShVhNxMd_VzZF7Q",
  authDomain: "car-maintenance-app-f120a.firebaseapp.com",
  projectId: "car-maintenance-app-f120a",
  storageBucket: "car-maintenance-app-f120a.firebasestorage.app",
  messagingSenderId: "117620534937",
  appId: "1:117620534937:web:3f5c06997243828f7c5208",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);