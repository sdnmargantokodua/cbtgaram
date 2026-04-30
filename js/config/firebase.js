// js/config/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAYRADmjYNjElFbbScoLjdEY7MCYg4bh84",
    authDomain: "cbtgaram.firebaseapp.com",
    projectId: "cbtgaram",
    storageBucket: "cbtgaram.firebasestorage.app",
    messagingSenderId: "1017527734586",
    appId: "1:1017527734586:web:d98583e3f7706086f50003"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
