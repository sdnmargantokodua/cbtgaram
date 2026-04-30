import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// SESSION & UTILS
// ==========================================
window.checkAdminSession = () => {
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('flex');
        initFirebase();
    }
};

window.handleLogin = (e) => {
    e.preventDefault();
    if (document.getElementById('inputPinAdmin').value === state.ADMIN_PIN) {
        sessionStorage.setItem('admin_logged_in', 'true');
        checkAdminSession();
    } else { document.getElementById('loginError').classList.remove('hidden'); }
};

window.logoutAdmin = () => {
    sessionStorage.removeItem('admin_logged_in');
    location.reload();
};

window.switchTab = (id, title) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.menu-btn').forEach(btn => btn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 transition");
    document.getElementById(id).classList.remove('hidden');
    document.getElementById('btn-' + id).className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-900/50";
    document.getElementById('pageTitle').innerText = title;
    if (window.innerWidth < 768) toggleSidebar();
};

window.toggleSidebar = () => {
    const s = document.getElementById('sidebar');
    s.classList.contains('-translate-x-full') ? s.classList.remove('-translate-x-full') : s.classList.add('-translate-x-full');
};

window.closeModal = (m) => document.getElementById(m).classList.add('hidden');

// ==========================================
// DATA UMUM: TAHUN & SEMESTER
// ==========================================
state.academicConfig = { years: [], activeSemester: 'Ganjil' };
window.loadTahunPelajaran = async () => {
    const docSnap = await getDoc(doc(db, 'settings', 'academic_config'));
    state.academicConfig = docSnap.exists() ? docSnap.data() : { years: [{ id: '1', name: '2025/2026', isActive: true }], activeSemester: 'Ganjil' };
    renderTableTahunSemester();
};

window.renderTableTahunSemester = () => {
    const tbT = document.getElementById('tableTahunBody');
    const tbS = document.getElementById('tableSemesterBody');
    tbT.innerHTML = ''; tbS.innerHTML = '';
    state.academicConfig.years.forEach((y, i) => {
        tbT.innerHTML += `<tr><td class="p-3">${i+1}</td><td class="p-3 font-bold">${y.name}</td><td class="p-3">${y.isActive ? '✅ AKTIF' : `<button onclick="setAktifTahun('${y.id}')" class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">AKTIFKAN</button>`}</td><td class="p-3 space-x-2"><button onclick="editTahun('${y.id}')" class="text-amber-500">Edit</button><button onclick="hapusTahun('${y.id}')" class="text-red-500">Hapus</button></td></tr>`;
    });
    ['Ganjil', 'Genap'].forEach((s, i) => {
        const isA = state.academicConfig.activeSemester === s;
        tbS.innerHTML += `<tr><td class="p-3">${i+1}</td><td class="p-3 font-bold">${s}</td><td class="p-3">${isA ? '✅ AKTIF' : `<button onclick="setAktifSemester('${s}')" class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">AKTIFKAN</button>`}</td></tr>`;
    });
};

window.openModalTahun = () => { document.getElementById('tahunId').value = ''; document.getElementById('inputNamaTahun').value = ''; document.getElementById('modalTahunPelajaran').classList.remove('hidden'); };
window.simpanTahunPelajaran = async () => {
    const id = document.getElementById('tahunId').value; const name = document.getElementById('inputNamaTahun').value.trim();
    if (!name) return;
    let ys = [...state.academicConfig.years];
    if(id) { const idx = ys.findIndex(x => x.id === id); ys[idx].name = name; } else { ys.push({id: Date.now().toString(), name: name, isActive: ys.length === 0}); }
    state.academicConfig.years = ys;
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
    closeModal('modalTahunPelajaran'); loadTahunPelajaran();
};

window.setAktifTahun = async (id) => { state.academicConfig.years.forEach(y => y.isActive = (y.id === id)); await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig); loadTahunPelajaran(); };
window.setAktifSemester = async (s) => { state.academicConfig.activeSemester = s; await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig); loadTahunPelajaran(); };

// ==========================================
// DATA UMUM: MATA PELAJARAN (SD)
// ==========================================
window.loadMataPelajaran = async () => {
    const snap = await getDocs(collection(db, 'master_subjects'));
    state.masterSubjects = []; snap.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()}));
    if (state.masterSubjects.length === 0) {
        const sd = [
            {nama: 'Pendidikan Agama dan Budi Pekerti', kode: 'PABP', kelompok: 'Kelompok A (Wajib)', isActive: true},
            {nama: 'Pendidikan Pancasila', kode: 'PPKN', kelompok: 'Kelompok A (Wajib)', isActive: true},
            {nama: 'Bahasa Indonesia', kode: 'BIND', kelompok: 'Kelompok A (Wajib)', isActive: true},
            {nama: 'Matematika', kode: 'MTK', kelompok: 'Kelompok A (Wajib)', isActive: true},
            {nama: 'Ilmu Pengetahuan Alam dan Sosial', kode: 'IPAS', kelompok: 'Kelompok A (Wajib)', isActive: true},
            {nama: 'Bahasa Inggris', kode: 'BING', kelompok: 'Kelompok B (Muatan Lokal)', isActive: true}
        ];
        for (const m of sd) { await addDoc(collection(db, 'master_subjects'), m); }
        loadMataPelajaran(); return;
    }
    renderTableMataPelajaran(); updateSubjectDropdownDinamis();
};

window.renderTableMataPelajaran = () => {
    const tb = document.getElementById('tableMapelBody'); tb.innerHTML = '';
    state.masterSubjects.forEach(m => {
        tb.innerHTML += `<tr><td class="p-3 text-center font-mono font-bold">${m.kode}</td><td class="p-3 font-bold">${m.nama}</td><td class="p-3 text-center text-xs">${m.kelompok}</td><td class="p-3 text-center">${m.isActive ? '✅' : '❌'}</td><td class="p-3 text-center space-x-2"><button onclick="editMapel('${m.id}')" class="text-amber-500">Edit</button><button onclick="hapusMapel('${m.id}')" class="text-red-500">Hapus</button></td></tr>`;
    });
};

window.openModalMapel = () => { document.getElementById('mapelId').value = ''; document.getElementById('inputNamaMapel').value = ''; document.getElementById('inputKodeMapel').value = ''; document.getElementById('modalMataPelajaran').classList.remove('hidden'); };
window.simpanMapel = async () => {
    const data = { nama: document.getElementById('inputNamaMapel').value, kode: document.getElementById('inputKodeMapel').value.toUpperCase(), kelompok: document.getElementById('inputKelompokMapel').value, isActive: document.getElementById('inputStatusMapel').checked };
    const id = document.getElementById('mapelId').value;
    id ? await updateDoc(doc(db, 'master_subjects', id), data) : await addDoc(collection(db, 'master_subjects'), data);
    closeModal('modalMataPelajaran'); loadMataPelajaran();
};

// ==========================================
// DATA UMUM: JURUSAN[cite: 11]
// ==========================================
window.loadJurusan = async () => {
    const snap = await getDocs(collection(db, 'master_majors'));
    state.allMajors = []; snap.forEach(d => state.allMajors.push({id: d.id, ...d.data()}));
    renderTableJurusan();
};

window.renderTableJurusan = () => {
    const tb = document.getElementById('tableJurusanBody'); tb.innerHTML = '';
    state.allMajors.forEach((j, i) => {
        tb.innerHTML += `<tr><td class="p-3">${i+1}</td><td class="p-3 font-mono font-bold">${j.kode}</td><td class="p-3 uppercase">${j.nama}</td><td class="p-3 text-center space-x-2"><button onclick="editJurusan('${j.id}')" class="text-amber-500">Edit</button><button onclick="hapusJurusan('${j.id}')" class="text-red-500">Hapus</button></td></tr>`;
    });
};

window.openModalJurusan = () => { document.getElementById('jurusanId').value = ''; document.getElementById('inputKodeJurusan').value = ''; document.getElementById('inputNamaJurusan').value = ''; document.getElementById('modalJurusan').classList.remove('hidden'); };
window.simpanJurusan = async () => {
    const data = { kode: document.getElementById('inputKodeJurusan').value.toUpperCase(), nama: document.getElementById('inputNamaJurusan').value.toUpperCase() };
    const id = document.getElementById('jurusanId').value;
    id ? await updateDoc(doc(db, 'master_majors', id), data) : await addDoc(collection(db, 'master_majors'), data);
    closeModal('modalJurusan'); loadJurusan();
};

// ==========================================
// PROFIL SEKOLAH & LOGO COMPRESSION
// ==========================================
window.isiFormProfil = () => {
    const p = state.schoolProfile;
    document.getElementById('profSekolah').value = p.namaSekolah || '';
    document.getElementById('profAlamat').value = p.alamat || '';
    document.getElementById('profEmail').value = p.email || '';
    document.getElementById('profWebsite').value = p.website || '';
    document.getElementById('profNamaUjian').value = p.namaUjian || 'Penilaian Akhir Jenjang (PAJ)';
    document.getElementById('profKelas').value = p.kelas || '';
    document.getElementById('logoKabBase64').value = p.logoKab || '';
    document.getElementById('logoSekolahBase64').value = p.logoSekolah || '';
    updatePreviewKop();
};

window.previewImage = (input, previewId, base64Id) => {
    const f = input.files[0];
    if (f) {
        const r = new FileReader(); r.onload = (e) => {
            const img = new Image(); img.onload = () => {
                const c = document.createElement('canvas'); const MAX = 300; let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h *= MAX / w; w = MAX; } } else { if (h > MAX) { w *= MAX / h; h = MAX; } }
                c.width = w; c.height = h; const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
                const base64 = c.toDataURL('image/webp', 0.8);
                document.getElementById(previewId).src = base64; document.getElementById(previewId).classList.remove('hidden');
                document.getElementById(base64Id).value = base64;
            }; img.src = e.target.result;
        }; r.readAsDataURL(f);
    }
};

window.simpanProfil = async () => {
    const data = {
        namaSekolah: document.getElementById('profSekolah').value.toUpperCase(),
        alamat: document.getElementById('profAlamat').value,
        email: document.getElementById('profEmail').value,
        website: document.getElementById('profWebsite').value,
        namaUjian: document.getElementById('profNamaUjian').value,
        kelas: document.getElementById('profKelas').value,
        logoKab: document.getElementById('logoKabBase64').value || null,
        logoSekolah: document.getElementById('logoSekolahBase64').value || null
    };
    await setDoc(doc(db, 'school_profile', 'main_profile'), data, { merge: true });
    alert("Profil Berhasil Disimpan!");
};

// ==========================================
// PESERTA: EXPORT/IMPORT EXCEL & GENERATE
// ==========================================
window.generatePassword = () => {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let p = '';
    for (let i = 0; i < 6; i++) p += c.charAt(Math.floor(Math.random() * c.length));
    document.getElementById('pesertaPassword').value = p;
};

window.downloadFormatPeserta = () => {
    let data = state.examParticipants.length > 0 ? state.examParticipants.map(p => ({ ABSEN: p.absen, NO_UJIAN: p.noUjian, NAMA: p.nama, KELAS: p.kelas, RUANG: p.ruang, SESI: p.sesi, PASSWORD: p.password })) : [{ABSEN:1, NO_UJIAN:'001', NAMA:'CONTOH', KELAS:'VI', RUANG:'01', SESI:'1', PASSWORD:'123'}];
    const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Peserta");
    XLSX.writeFile(wb, "Data_Peserta.xlsx");
};

window.prosesImportPeserta = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    const r = new FileReader(); r.onload = async (evt) => {
        const d = new Uint8Array(evt.target.result); const wb = XLSX.read(d, {type:'array'});
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        for (const row of json) {
            const p = { absen: row.ABSEN, noUjian: row.NO_UJIAN, nama: row.NAMA.toUpperCase(), kelas: row.KELAS, ruang: row.RUANG, sesi: row.SESI, password: row.PASSWORD || row.ABSEN };
            const ex = state.examParticipants.find(x => x.absen == p.absen);
            ex ? await updateDoc(doc(db, 'exam_participants', ex.id), p) : await addDoc(collection(db, 'exam_participants'), p);
        }
        alert("Import Selesai!"); location.reload();
    }; r.readAsArrayBuffer(f);
};

// Start Session Check
checkAdminSession();
