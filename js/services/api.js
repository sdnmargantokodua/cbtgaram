// js/services/api.js
import { auth, db } from '../config/firebase.js';
import { state } from './store.js';
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { collection, doc, addDoc, updateDoc, deleteDoc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

export async function initFirebase() {
    document.getElementById('loadingIndicator').classList.remove('hidden');
    try {
        await signInAnonymously(auth);
        onAuthStateChanged(auth, (user) => {
            if (user) setupRealtimeListeners();
        });
    } catch (e) {
        console.error("Firebase init failed", e);
        alert("Gagal koneksi ke server database.");
    }
}

function setupRealtimeListeners() {
    onSnapshot(collection(db, 'exam_results'), (snapshot) => {
        state.allResults = [];
        snapshot.forEach((doc) => state.allResults.push({ id: doc.id, ...doc.data() }));
        state.allResults.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        if(window.updateSubjectDropdownDinamis) window.updateSubjectDropdownDinamis();
        if(window.renderTableNilai) window.renderTableNilai();
    });

    onSnapshot(collection(db, 'exam_questions'), (snapshot) => {
        state.allQuestions = [];
        snapshot.forEach((doc) => state.allQuestions.push({ id: doc.id, ...doc.data() }));
        if(window.updateSubjectDropdownDinamis) window.updateSubjectDropdownDinamis();
        if(window.renderTableSoal) window.renderTableSoal();
        document.getElementById('loadingIndicator').classList.add('hidden');
    });

    onSnapshot(collection(db, 'exam_schedules'), (snapshot) => {
        state.examSchedules = [];
        snapshot.forEach((doc) => state.examSchedules.push({ id: doc.id, ...doc.data() }));
        if(window.renderTableUjian) window.renderTableUjian();
    });

    onSnapshot(collection(db, 'exam_participants'), (snapshot) => {
        state.examParticipants = [];
        snapshot.forEach((doc) => state.examParticipants.push({ id: doc.id, ...doc.data() }));
        state.examParticipants.sort((a, b) => (parseInt(a.absen) || 0) - (parseInt(b.absen) || 0));
        if(window.renderTablePeserta) window.renderTablePeserta();
    });

    onSnapshot(doc(db, 'school_profile', 'main_profile'), (docSnap) => {
        if (docSnap.exists()) {
            state.schoolProfile = docSnap.data();
            if(window.isiFormProfil) window.isiFormProfil();
        }
    });
}

export { db, collection, doc, addDoc, updateDoc, deleteDoc, setDoc };
