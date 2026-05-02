import { db, doc, collection, getDocs, getDoc, addDoc, updateDoc, setDoc } from '../services/api.js';
import { query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

/**
 * ==========================================
 * STATE ENGINE UJIAN (Penyimpanan Memori)
 * ==========================================
 */
const state = {
    siswa: null,
    jadwalAktif: null,
    sesiId: null,      // ID dokumen di tabel cbt_sesi_siswa
    bankSoal: [],      // Daftar butir soal
    jawabanSiswa: {},  // Memori jawaban sementara { index: "A" }
    currentIndex: 0,
    timerInterval: null,
    endTimeServer: 0   // Waktu target selesai (milidetik)
};

/**
 * ==========================================
 * 1. PROSES LOGIN & VALIDASI JADWAL
 * ==========================================
 */
document.getElementById('formLoginSiswa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('inUser').value.trim();
    const pass = document.getElementById('inPass').value.trim();
    const btn = e.target.querySelector('button');
    
    btn.innerText = 'MEMERIKSA...';
    btn.disabled = true;

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
            btn.disabled = false;
        }
    } catch(err) {
        console.error(err);
        alert("Gagal koneksi ke server.");
        btn.innerText = 'LOGIN UJIAN';
        btn.disabled = false;
    }
});

const bukaKonfirmasi = async () => {
    document.getElementById('confirmScreen').classList.remove('hidden');
    document.getElementById('confirmScreen').classList.add('flex');
    
    document.getElementById('confNis').innerText = state.siswa.nis || state.siswa.nisn;
    document.getElementById('confNama').innerText = state.siswa.nama;
    document.getElementById('confKelas').innerText = state.siswa.kelas;

    document.getElementById('confMapel').innerText = "Mencari jadwal aktif...";
    
    try {
        const qJadwal = query(collection(db, 'master_jadwal_ujian'), where('isActive', '==', true));
        const snapJadwal = await getDocs(qJadwal);
        let targetJadwal = null;

        snapJadwal.forEach(d => {
            const jdw = d.data();
            // Validasi tambahan: bisa ditambahkan filter kelas di sini
            targetJadwal = { id: d.id, ...jdw };
        });

        if(targetJadwal) {
            state.jadwalAktif = targetJadwal;
            document.getElementById('confMapel').innerText = `${targetJadwal.mapel} (${targetJadwal.jenis})`;
            document.getElementById('btnMulaiUjian').disabled = false;
        } else {
            document.getElementById('confMapel').innerText = "Belum ada ujian yang diaktifkan Admin.";
            document.getElementById('btnMulaiUjian').disabled = true;
        }
    } catch(e) { console.error(e); }
};

/**
 * ==========================================
 * 2. INISIALISASI SESI (PILAR: TIMER SERVER)
 * ==========================================
 */
document.getElementById('btnMulaiUjian').onclick = async () => {
    // Validasi Token
    const inToken = document.getElementById('inToken')?.value.trim().toUpperCase();
    if(state.jadwalAktif.gunakanToken) {
        const snapTok = await getDoc(doc(db, 'settings', 'token_ujian'));
        if(snapTok.exists() && inToken !== snapTok.data().currentToken) {
            return alert("Token Salah atau Kadaluarsa!");
        }
    }

    document.getElementById('confirmScreen').classList.add('hidden');
    inisialisasiUjianKeServer();
};

const inisialisasiUjianKeServer = async () => {
    document.getElementById('examScreen').classList.remove('hidden');
    document.getElementById('examScreen').classList.add('flex');
    
    document.getElementById('examTitleInfo').innerText = state.jadwalAktif.mapel;
    document.getElementById('examSiswaInfo').innerText = `${state.siswa.nama} - ${state.siswa.kelas}`;

    state.sesiId = `${state.jadwalAktif.id}_${state.siswa.id}`;
    const durasiMenit = state.jadwalAktif.durasi || 90;
    
    try {
        const sesiRef = doc(db, 'cbt_sesi_siswa', state.sesiId);
        const sesiSnap = await getDoc(sesiRef);

        if (sesiSnap.exists()) {
            const dataSesi = sesiSnap.data();
            // Cek jika sesi direset oleh admin
            if (dataSesi.status.includes('DIRESET')) {
                state.endTimeServer = Date.now() + (durasiMenit * 60 * 1000);
                state.jawabanSiswa = {};
            } else {
                state.endTimeServer = dataSesi.waktu_selesai_target; 
                state.jawabanSiswa = dataSesi.jawaban || {};
            }
        } else {
            // Sesi Baru: Tetapkan target waktu selesai absolut
            state.endTimeServer = Date.now() + (durasiMenit * 60 * 1000);
        }

        // Catat sesi agar muncul di Radar Admin secara Real-time
        await setDoc(sesiRef, {
            jadwal_id: state.jadwalAktif.id,
            siswa_id: state.siswa.id,
            nis: state.siswa.nis || state.siswa.nisn,
            nama: state.siswa.nama,
            kelas: state.siswa.kelas,
            status: "MENGERJAKAN",
            waktu_mulai: serverTimestamp(), 
            waktu_selesai_target: state.endTimeServer,
            jawaban: state.jawabanSiswa,
            last_ping: serverTimestamp()
        });

        // Load Butir Soal
        const snapSoal = await getDocs(collection(db, `master_bank_soal/${state.jadwalAktif.bankSoalId}/butir_soal`));
        state.bankSoal = [];
        snapSoal.forEach(d => state.bankSoal.push({ id: d.id, ...d.data() }));

        if(state.jadwalAktif.acakSoal) state.bankSoal.sort(() => Math.random() - 0.5);

        renderGridNavigasi();
        tampilkanSoal(0);
        mulaiTimerAntiCheat();

    } catch(e) { 
        console.error(e); 
        alert("Gagal sinkronisasi dengan server. Hubungi pengawas."); 
    }
};

/**
 * ==========================================
 * 3. ENGINE SOAL & AUTO-SAVE (PILAR: REAL-TIME)
 * ==========================================
 */
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
        ['A', 'B', 'C', 'D', 'E'].forEach(k => {
            if(soal.opsi && soal.opsi[k]) {
                const isChecked = state.jawabanSiswa[index] === k ? 'checked' : '';
                const bgActive = isChecked ? 'bg-blue-50 border-blue-500' : 'bg-white border-slate-200';
                
                areaOpsi.innerHTML += `
                    <label class="flex items-start gap-4 p-4 border rounded-xl cursor-pointer transition ${bgActive}">
                        <input type="radio" name="opsiJawaban" value="${k}" ${isChecked} onchange="simpanJawabanLokal(${index}, '${k}')" class="mt-1 w-5 h-5 accent-blue-600">
                        <div class="flex-1">
                            <span class="font-black text-slate-400 mr-2">${k}.</span>
                            <span class="text-slate-700 text-lg">${soal.opsi[k]}</span>
                        </div>
                    </label>`;
            }
        });
    } else {
        const val = state.jawabanSiswa[index] || '';
        areaOpsi.innerHTML = `<textarea oninput="simpanJawabanLokal(${index}, this.value)" class="w-full p-4 border border-slate-300 rounded-xl outline-none h-40 text-lg" placeholder="Ketik jawaban Anda...">${val}</textarea>`;
    }
    updateTombolNav();
    highlightNavAktif();
};

window.simpanJawabanLokal = async (index, val) => {
    state.jawabanSiswa[index] = val;
    renderGridNavigasi();
    
    // AUTO-SAVE: Kirim ke Firebase agar Admin bisa melihat progres secara live
    try {
        await updateDoc(doc(db, 'cbt_sesi_siswa', state.sesiId), {
            [`jawaban.${index}`]: val,
            last_ping: serverTimestamp() 
        });
    } catch(e) { console.error("Koneksi tidak stabil, jawaban disimpan di lokal."); }
};

const renderGridNavigasi = () => {
    const grid = document.getElementById('gridNavigasiSoal');
    if(!grid) return;
    grid.innerHTML = '';
    state.bankSoal.forEach((_, i) => {
        const isDijawab = state.jawabanSiswa[i] !== undefined && state.jawabanSiswa[i].toString().trim() !== '';
        const bg = isDijawab ? 'bg-green-500 text-white border-green-600' : 'bg-white text-slate-600 border-slate-300';
        grid.innerHTML += `<button id="navBtn_${i}" onclick="tampilkanSoal(${i})" class="w-full aspect-square flex items-center justify-center font-bold text-sm border rounded transition ${bg}">${i+1}</button>`;
    });
};

const highlightNavAktif = () => {
    state.bankSoal.forEach((_, i) => {
        const btn = document.getElementById(`navBtn_${i}`);
        if(btn) btn.classList.remove('ring-4', 'ring-blue-300');
    });
    const activeBtn = document.getElementById(`navBtn_${state.currentIndex}`);
    if(activeBtn) activeBtn.classList.add('ring-4', 'ring-blue-300');
};

const updateTombolNav = () => {
    document.getElementById('btnPrev').onclick = () => { if(state.currentIndex > 0) tampilkanSoal(state.currentIndex - 1); };
    document.getElementById('btnNext').onclick = () => { if(state.currentIndex < state.bankSoal.length - 1) tampilkanSoal(state.currentIndex + 1); };
    document.getElementById('btnPrev').disabled = state.currentIndex === 0;
    document.getElementById('btnNext').disabled = state.currentIndex === state.bankSoal.length - 1;
};

/**
 * ==========================================
 * 4. TIMER & SUBMIT (PILAR: SKORING)
 * ==========================================
 */
const mulaiTimerAntiCheat = () => {
    const display = document.getElementById('timerDisplay');
    state.timerInterval = setInterval(() => {
        const sisaMs = state.endTimeServer - Date.now();

        if (sisaMs <= 0) {
            clearInterval(state.timerInterval);
            alert("Waktu habis! Jawaban Anda akan dikirim otomatis.");
            selesaiDanSubmit();
        } else {
            const h = Math.floor((sisaMs / (1000 * 60 * 60)) % 24);
            const m = Math.floor((sisaMs / (1000 * 60)) % 60);
            const s = Math.floor((sisaMs / 1000) % 60);
            display.innerText = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
            if(sisaMs < 300000) display.classList.add('text-red-500', 'animate-pulse');
        }
    }, 1000);
};

document.getElementById('btnSelesaiUjian').onclick = () => {
    if(confirm("Anda yakin ingin mengakhiri ujian?")) {
        clearInterval(state.timerInterval);
        selesaiDanSubmit();
    }
};

const selesaiDanSubmit = async () => {
    const btn = document.getElementById('btnSelesaiUjian');
    btn.innerText = "MENYIMPAN...";
    btn.disabled = true;

    // SKORING OTOMATIS (Hanya PG)
    let benar = 0;
    state.bankSoal.forEach((soal, i) => {
        if(soal.tipe === 'PG' && state.jawabanSiswa[i] === soal.kunci) benar++;
    });

    const totalPG = state.bankSoal.filter(s => s.tipe === 'PG').length || 1;
    const skor = Math.round((benar / totalPG) * 100 * 100) / 100;

    const dataHasil = {
        siswaId: state.siswa.id,
        nis: state.siswa.nis || state.siswa.nisn,
        nama: state.siswa.nama,
        kelas: state.siswa.kelas,
        jadwalId: state.jadwalAktif.id,
        jawaban: state.jawabanSiswa,
        benar, 
        salah: totalPG - benar,
        skor,
        timestamp: serverTimestamp()
    };

    try {
        // Simpan Hasil Akhir
        await addDoc(collection(db, 'exam_results'), dataHasil);
        
        // Update Radar Admin menjadi 'SELESAI'
        await updateDoc(doc(db, 'cbt_sesi_siswa', state.sesiId), {
            status: "SELESAI",
            last_ping: serverTimestamp()
        });

        alert(`Ujian Selesai! Skor Anda: ${skor}`);
        location.reload(); 
    } catch(e) {
        alert("Gagal mengirim hasil. Hubungi pengawas dan JANGAN TUTUP BROWSER!");
        btn.innerText = "COBA KIRIM LAGI";
        btn.disabled = false;
    }
};

window.tampilkanSoal = tampilkanSoal;
