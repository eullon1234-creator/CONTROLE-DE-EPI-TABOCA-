import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCbxIM6PfyZvWngcIByoH-sQFOtJht6TrE",
  authDomain: "controle-de-epi-tabooca.firebaseapp.com",
  projectId: "controle-de-epi-tabooca",
  storageBucket: "controle-de-epi-tabooca.firebasestorage.app",
  messagingSenderId: "664784767433",
  appId: "1:664784767433:web:86e454788aaebaf2c60018",
  measurementId: "G-RB1S25HRB7"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
