import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyB6M7MmuIZZXdMDNMtYfgxgxaOKcYQxXHU",
    authDomain: "quiz-035.firebaseapp.com",
    projectId: "quiz-035",
    storageBucket: "quiz-035.firebasestorage.app",
    messagingSenderId: "548827086054",
    appId: "1:548827086054:web:bf04fe6070ee6fb3654f27",
    measurementId: "G-LJ796DRJ18"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
