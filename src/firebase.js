import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAQ0qxy6I3sXX_YdednV5eb2C7r082YK3A",
  authDomain: "leadradar-slg.firebaseapp.com",
  projectId: "leadradar-slg",
  storageBucket: "leadradar-slg.firebasestorage.app",
  messagingSenderId: "38736441433",
  appId: "1:38736441433:web:b2cfc9164cb56384338148"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DOC_REF = doc(db, "leadradar", "shared");

export async function loadShared() {
  try {
    const snap = await getDoc(DOC_REF);
    if (snap.exists()) return snap.data();
    return { leads: [], descartados: [], assignments: {}, feedback: {}, feedbackLog: [], lastSync: null };
  } catch (e) {
    console.error("Firebase load error", e);
    return { leads: [], descartados: [], assignments: {}, feedback: {}, feedbackLog: [], lastSync: null };
  }
}

export async function saveShared(data) {
  try {
    await setDoc(DOC_REF, data);
  } catch (e) {
    console.error("Firebase save error", e);
  }
}
