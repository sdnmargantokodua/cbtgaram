import { db, doc, collection, getDocs, getDoc, addDoc, updateDoc, setDoc } from '../services/api.js';
// Tambahkan serverTimestamp pada import Firestore
import { query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const state = {
    siswa: null,
    jadwalAktif: null,
    sesiId: null, // Menyimpan ID sesi yang aktif
    bankSoal: [],
    jawabanSiswa: {}, 
    currentIndex: 0,
    timerInterval: null,
    endTimeServer: 0 // Menyimpan waktu target selesai absolut dalam hitungan milidetik
};

// ==========================================
// LOGIN & CARI JADWAL
// ==========================================
document.getElementById('formLoginSiswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('inUser').value.trim();
    const pass = document.getElementById('inPass').value.trim();
    const btn = e.target.querySelector('button');
    btn.innerText = 'MEMERIKSA...';

    try {
        const snap = await getDocs(collection(db, 'master_siswa'));
        let found = null;
        snap.forEach(d => {
            const dt = d.data();
            if ((dt.username === user || dt.nis === user || dt.nisn === user) && dt.password === pass) {
                found = { id: d.id, ...dt };
            }
        });

        if (found) {
            state.siswa = found;
            document.getElementById('loginScreen').classList.add('hidden');
            bukaKonfirmasi();
        } else {
            document.getElementById('msgError').classList.remove('hidden');
            btn.innerText = 'LOGIN UJIAN';
        }
    } catch(err) {
        console.error(err);
        alert("Gagal koneksi ke server.");
        btn.innerText = 'LOGIN UJIAN';
    }
});

const bukaKonfirmasi = async () => {
    document.getElementById('confirmScreen').classList.remove('hidden');
    document.getElementById('confirmScreen').classList.add('flex');
    
    document.getElementById('confNis').innerText = state.siswa.nis || state.siswa.nisn;
    document.getElementById('confNama').innerText = state.siswa.nama;
    document.getElementById('confKelas').innerText = state.siswa.kelas;

    document.getElementById('confMapel').innerText = "Mencari jadwal...";
    try {
        const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
        let targetJadwal = null;
        
        // Cari jadwal aktif pertama (Sederhana)
        snapJadwal.forEach(d => {
            const jdw = d.data();
            if(jdw.isActive) targetJadwal = { id: d.id, ...jdw };
        });

        if(targetJadwal) {
            state.jadwalAktif = targetJadwal;
            document.getElementById('confMapel').innerText = `${targetJadwal.mapel} (${targetJadwal.jenis})`;
        } else {
            document.getElementById('confMapel').innerText = "Belum ada ujian aktif.";
            document.getElementById('btnMulaiUjian').disabled = true;
        }
    } catch(e) { console.error(e); }
};

document.getElementById('btnSiswaLogout').onclick = () => location.reload();

// ==========================================
// MULAI UJIAN & TIMER ANTI-CHEAT
// ==========================================
document.getElementById('btnMulaiUjian').onclick = async () => {
    // Validasi Token
    const inToken = document.getElementById('inToken').value.trim().toUpperCase();
    if(state.jadwalAktif.gunakanToken) {
        const snapTok = await getDoc(doc(db, 'settings', 'token_ujian'));
        if(snapTok.exists() && inToken !== snapTok.data().currentToken) {
            return alert("Token Salah atau Kadaluarsa!");
        }
    }

    document.getElementById('confirmScreen').classList.add('hidden');
    document.getElementById('confirmScreen').classList.remove('flex');
    
    // Panggil Logika Mulai Ujian Baru
    inisialisasiUjianKeServer();
};

// Modifikasi Logika Mulai Ujian untuk mencatat Sesi ke Firebase (Agar muncul di Radar Admin)
const inisialisasiUjianKeServer = async () => {
    document.getElementById('examScreen').classList.remove('hidden');
    document.getElementById('examScreen').classList.add('flex');
    
    document.getElementById('examTitleInfo').innerText = state.jadwalAktif.mapel;
    document.getElementById('examSiswaInfo').innerText = `${state.siswa.nama} - ${state.siswa.kelas}`;

    state.sesiId = `${state.jadwalAktif.id}_${state.siswa.id}`;
    const durasiMenit = state.jadwalAktif.durasi || 90;
    
    try {
        // CEK APAKAH SISWA SUDAH PERNAH MEMULAI UJIAN INI SEBELUMNYA (Jika terputus)
        const sesiRef = doc(db, 'cbt_sesi_siswa', state.sesiId);
        const sesiSnap = await getDoc(sesiRef);

        if (sesiSnap.exists()) {
            // JIKA TERPUTUS: Ambil sisa waktu dan jawaban dari database
            const dataSesi = sesiSnap.data();
            state.endTimeServer = dataSesi.waktu_selesai_target; 
            state.jawabanSiswa = dataSesi.jawaban || {};
            console.log("Melanjutkan sesi ujian sebelumnya...");
        } else {
            // JIKA BARU PERTAMA KALI: Hitung target waktu selesai dan buat sesi baru
            state.endTimeServer = Date.now() + (durasiMenit * 60 * 1000); // Batas Waktu Absolut
            
            await setDoc(sesiRef, {
                jadwal_id: state.jadwalAktif.id,
                siswa_id: state.siswa.id,
                nama: state.siswa.nama,
                kelas: state.siswa.kelas,
                status: "MENGERJAKAN",
                waktu_mulai: serverTimestamp(), 
                waktu_selesai_target: state.endTimeServer, // Catat agar jika mati lampu timer tidak keriset
                jawaban: {},
                last_ping: serverTimestamp()
            });
            console.log("Sesi ujian baru dimulai.");
        }

        // --- Load Soal ---
        const snapSoal = await getDocs(collection(db, `master_bank_soal/${state.jadwalAktif.bankSoalId}/butir_soal`));
        state.bankSoal = [];
        snapSoal.forEach(d => state.bankSoal.push({ id: d.id, ...d.data() }));

        if(state.jadwalAktif.acakSoal) {
            state.bankSoal = state.bankSoal.sort(() => Math.random() - 0.5);
        }

        renderGridNavigasi();
        tampilkanSoal(0);
        
        // Panggil fungsi timer yang sudah dirombak
        mulaiTimerAntiCheat(); 

        // Load Running Text
        const rSnap = await getDoc(doc(db, 'settings', 'pengumuman_config'));
        if(rSnap.exists()) {
            const conf = rSnap.data();
            document.getElementById('runningTextDisplay').innerText = `${conf.r1 || ''} *** ${conf.r2 || ''} *** ${conf.r3 || ''}`;
        }

    } catch(e) { 
        console.error(e); 
        alert("Gagal menginisialisasi ujian ke server."); 
    }
};

// ==========================================
// RENDER SOAL & NAVIGASI
// ==========================================
const tampilkanSoal = (index) => {
    state.currentIndex = index;
    const soal = state.bankSoal[index];
    
    document.getElementById('labelNoSoalAktif').innerText = `Soal No. ${index + 1}`;
    document.getElementById('labelTipeSoal').innerText = soal.tipe === 'PG' ? 'Pilihan Ganda' : soal.tipe;
    document.getElementById('teksPertanyaan').innerHTML = soal.pertanyaan || '';
    
    if(window.MathJax) MathJax.typesetPromise([document.getElementById('teksPertanyaan')]);

    const areaOpsi = document.getElementById('areaOpsiJawaban');
    areaOpsi.innerHTML = '';

    if(soal.tipe === 'PG') {
        const abjad = ['A', 'B', 'C', 'D', 'E'];
        abjad.forEach(k => {
            if(soal.opsi && soal.opsi[k]) {
                const isChecked = state.jawabanSiswa[index] === k ? 'checked' : '';
                const bgActive = isChecked ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300';
                
                areaOpsi.innerHTML += `
                    <label class="flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition ${bgActive}">
                        <input type="radio" name="opsiJawaban" value="${k}" ${isChecked} onchange="simpanJawabanLokal(${index}, '${k}')" class="mt-1 w-5 h-5 accent-blue-600">
                        <div class="flex-1">
                            <span class="font-black text-slate-400 mr-2">${k}.</span>
                            <span class="text-slate-700 text-lg">${soal.opsi[k]}</span>
                        </div>
                    </label>
                `;
            }
        });
    } else {
        const val = state.jawabanSiswa[index] || '';
        areaOpsi.innerHTML = `
            <textarea oninput="simpanJawabanLokal(${index}, this.value)" class="w-full p-4 border border-slate-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-40 text-lg" placeholder="Ketik jawaban Anda di sini...">${val}</textarea>
        `;
    }

    updateTombolNav();
    highlightNavAktif();
};

window.simpanJawabanLokal = async (index, val) => {
    state.jawabanSiswa[index] = val;
    renderGridNavigasi(); 
    highlightNavAktif();

    // PILAR 3: AUTO SAVE KE FIREBASE 
    // Mencegah data hilang jika mati lampu, dan agar admin tahu siswa sedang aktif
    try {
        await updateDoc(doc(db, 'cbt_sesi_siswa', state.sesiId), {
            [`jawaban.${index}`]: val,
            last_ping: serverTimestamp() 
        });
    } catch(e) {
        console.error("Auto-save terputus:", e);
    }
};

const renderGridNavigasi = () => {
    const grid = document.getElementById('gridNavigasiSoal');
    grid.innerHTML = '';
    state.bankSoal.forEach((_, i) => {
        const isDijawab = state.jawabanSiswa[i] !== undefined && state.jawabanSiswa[i].trim() !== '';
        const bg = isDijawab ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300';
        grid.innerHTML += `<button id="navBtn_${i}" onclick="tampilkanSoal(${i})" class="w-full aspect-square flex items-center justify-center font-bold text-sm border rounded transition ${bg}">${i+1}</button>`;
    });
};

const highlightNavAktif = () => {
    for(let i=0; i<state.bankSoal.length; i++) {
        const btn = document.getElementById(`navBtn_${i}`);
        if(btn) btn.classList.remove('ring-4', 'ring-blue-300');
    }
    const activeBtn = document.getElementById(`navBtn_${state.currentIndex}`);
    if(activeBtn) activeBtn.classList.add('ring-4', 'ring-blue-300');
};

const updateTombolNav = () => {
    document.getElementById('btnPrev').onclick = () => { if(state.currentIndex > 0) tampilkanSoal(state.currentIndex - 1); };
    document.getElementById('btnNext').onclick = () => { if(state.currentIndex < state.bankSoal.length - 1) tampilkanSoal(state.currentIndex + 1); };
    
    document.getElementById('btnPrev').disabled = state.currentIndex === 0;
    document.getElementById('btnNext').disabled = state.currentIndex === state.bankSoal.length - 1;
};

// ==========================
// EKSEKUSI TIMER ANTI-CHEAT
// ==========================
const mulaiTimerAntiCheat = () => {
    const timerDisplay = document.getElementById('timerDisplay');
    
    state.timerInterval = setInterval(() => {
        // Hitung jarak antara WAKTU TARGET SERVER dikurangi WAKTU SEKARANG
        const sisaWaktuMs = state.endTimeServer - Date.now();

        if (sisaWaktuMs <= 0) {
            clearInterval(state.timerInterval);
            timerDisplay.innerText = "WAKTU HABIS!";
            timerDisplay.classList.add('text-red-600', 'animate-pulse');
            
            alert("Waktu ujian telah habis. Sistem akan otomatis mengirimkan jawaban Anda.");
            selesaiDanSubmit();
        } else {
            const h = Math.floor((sisaWaktuMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((sisaWaktuMs % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((sisaWaktuMs % (1000 * 60)) / 1000);
            
            timerDisplay.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

            // Warnai merah kalau sisa waktu < 5 Menit
            if(sisaWaktuMs < (5 * 60 * 1000)) {
                 timerDisplay.classList.add('text-red-500');
            }
        }
    }, 1000);
};

document.getElementById('btnSelesaiUjian').onclick = () => {
    let belumDijawab = 0;
    state.bankSoal.forEach((_, i) => {
        if(!state.jawabanSiswa[i] || state.jawabanSiswa[i].trim() === '') belumDijawab++;
    });

    const msg = belumDijawab > 0 
        ? `Masih ada ${belumDijawab} soal yang BELUM dijawab. Yakin ingin mengakhiri ujian?`
        : `Anda yakin ingin mengakhiri ujian ini?`;

    if(confirm(msg)) {
        clearInterval(state.timerInterval);
        selesaiDanSubmit();
    }
};

// ==========================
// SUBMIT NILAI
// ==========================
const selesaiDanSubmit = async () => {
    document.getElementById('btnSelesaiUjian').innerText = "Menyimpan...";
    document.getElementById('btnSelesaiUjian').disabled = true;

    // Simulasi Penilaian Koreksi PG Otomatis
    let benar = 0; let salah = 0;
    state.bankSoal.forEach((soal, i) => {
        if(soal.tipe === 'PG') {
            if(state.jawabanSiswa[i] === soal.kunci) benar++;
            else salah++;
        }
    });

    const maxSoal = state.bankSoal.filter(s => s.tipe==='PG').length || 1;
    let skor = (benar / maxSoal) * 100;
    skor = Math.round(skor * 100) / 100; // Pembulatan

    const hasil = {
        siswaId: state.siswa.id,
        nis: state.siswa.nis || state.siswa.nisn,
        nama: state.siswa.nama,
        kelas: state.siswa.kelas,
        jadwalId: state.jadwalAktif.id,
        jawaban: state.jawabanSiswa,
        benar, salah, skor,
        timestamp: serverTimestamp()
    };

    try {
        // 1. Kirim Nilai ke Database Permanen
        await addDoc(collection(db, 'exam_results'), hasil);
        
        // 2. Ubah Status di Radar Sesi Admin Menjadi 'SELESAI'
        if(state.sesiId) {
             await updateDoc(doc(db, 'cbt_sesi_siswa', state.sesiId), {
                 status: "SELESAI",
                 isOnline: false,
                 last_ping: serverTimestamp()
             });
        }

        alert(`Ujian selesai. Data telah disimpan.\n\nJika diizinkan melihat hasil:\nSkor Anda: ${skor}`);
        location.reload(); 
    } catch(e) {
        console.error(e);
        alert("Terjadi kesalahan sistem saat submit nilai. Hubungi Pengawas.");
    }
};

window.tampilkanSoal = tampilkanSoal;
