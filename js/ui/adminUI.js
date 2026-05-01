import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// SESSION & UI NAVIGATION (SIDEBAR FIXED)
// ==========================================
window.checkAdminSession = () => { 
    if (localStorage.getItem('admin_logged_in') === 'true') { 
        document.getElementById('loginScreen').classList.add('hidden'); 
        document.getElementById('appScreen').classList.remove('hidden'); 
        document.getElementById('appScreen').classList.add('flex'); 
        initFirebase(); 
        switchTab('viewDashboard', 'Dashboard'); 
    } else {
        document.getElementById('loginScreen').classList.remove('hidden'); 
        document.getElementById('appScreen').classList.add('hidden'); 
        document.getElementById('appScreen').classList.remove('flex'); 
    }
};

window.handleLogin = (e) => { 
    e.preventDefault(); 
    if (document.getElementById('inputPinAdmin').value === state.ADMIN_PIN) { 
        localStorage.setItem('admin_logged_in', 'true');
        checkAdminSession(); 
    } else { 
        document.getElementById('loginError').classList.remove('hidden'); 
    } 
};

window.logoutAdmin = () => {
    localStorage.removeItem('admin_logged_in');
    location.reload();
};

// Fungsi ini wajib ada agar dropdown sidebar bisa diklik
window.toggleNavMenu = (id) => {
    const menu = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        menu.classList.add('block');
        icon.classList.add('rotate-180');
    } else {
        menu.classList.add('hidden');
        menu.classList.remove('block');
        icon.classList.remove('rotate-180');
    }
};

// Fungsi ini wajib ada untuk buka-tutup sidebar di versi HP (Mobile)
window.toggleSidebar = () => { 
    const s = document.getElementById('sidebar'); 
    s.classList.contains('-translate-x-full') ? s.classList.remove('-translate-x-full') : s.classList.add('-translate-x-full'); 
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

// Fungsi perpindahan Tab yang sudah disesuaikan dengan HTML admin.html Anda
window.switchTab = (id, title) => { 
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); 
    document.querySelectorAll('.menu-btn').forEach(btn => btn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"); 
    
    document.getElementById(id).classList.remove('hidden'); 
    const activeBtn = document.getElementById('btn-' + id);
    if(activeBtn) activeBtn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-900/50"; 
    
    document.getElementById('pageTitle').innerText = title; 
    
    // Tutup sidebar otomatis jika di layar kecil
    if (window.innerWidth < 768) toggleSidebar(); 
};

// ==========================================
// DASHBOARD
// ==========================================
window.loadDashboard = async () => {
    try {
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        const snapMapel = await getDocs(collection(db, 'master_subjects'));
        const snapKelas = await getDocs(collection(db, 'master_kelas'));
        const snapGuru = await getDocs(collection(db, 'master_guru'));

        // Update ID sesuai dengan admin.html
        if(document.getElementById('dashSiswa')) document.getElementById('dashSiswa').innerText = snapSiswa.size;
        if(document.getElementById('dashRombel')) document.getElementById('dashRombel').innerText = snapKelas.size;
        if(document.getElementById('dashGuru')) document.getElementById('dashGuru').innerText = snapGuru.size;
        if(document.getElementById('dashMapel')) document.getElementById('dashMapel').innerText = snapMapel.size;
    } catch (e) { console.error("Error load dashboard:", e); }
};

// ==========================================
// AKADEMIK (TAHUN & SEMESTER)
// ==========================================
window.loadTahunPelajaran = async () => {
    try {
        const docRef = doc(db, 'settings', 'academic_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            state.academicConfig = docSnap.data();
        } else {
            state.academicConfig = { years: [{name: '2025/2026', isActive: true}], activeSemester: 'Ganjil' };
            await setDoc(docRef, state.academicConfig);
        }
        window.renderTahunPelajaran();
    } catch (e) { console.error(e); }
};

window.renderTahunPelajaran = () => {
    const tbTahun = document.getElementById('tableTahunBody');
    const tbSmt = document.getElementById('tableSemesterBody');
    if(!tbTahun || !tbSmt) return;

    tbTahun.innerHTML = '';
    tbSmt.innerHTML = '';
    
    if(state.academicConfig && state.academicConfig.years) {
        state.academicConfig.years.forEach((y, i) => {
            const badge = y.isActive 
                ? `<span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Aktif</span>` 
                : `<button onclick="setTahunAktif('${y.name}')" class="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-300 transition shadow-sm">Set Aktif</button>`;
            
            const btnHapus = y.isActive 
                ? `<span class="text-slate-300 text-xs italic">Digunakan</span>` 
                : `<button onclick="hapusTahun('${y.name}')" class="text-red-500 hover:text-red-700 transition">🗑️</button>`;
            
            tbTahun.innerHTML += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-center border-r text-slate-500 font-bold">${i+1}</td>
                    <td class="p-3 border-r font-bold text-slate-800 text-center">${y.name}</td>
                    <td class="p-3 border-r text-center">${badge}</td>
                    <td class="p-3 text-center">${btnHapus}</td>
                </tr>
            `;
        });
    }

    const smt = ['Ganjil', 'Genap'];
    const activeSmt = state.academicConfig ? state.academicConfig.activeSemester : 'Ganjil';
    smt.forEach((s, i) => {
        const badge = s === activeSmt 
            ? `<span class="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">Aktif</span>` 
            : `<button onclick="setSemesterAktif('${s}')" class="bg-slate-200 text-slate-700 px-3 py-1 rounded-full text-xs font-bold hover:bg-slate-300 transition shadow-sm">Set Aktif</button>`;
        
        tbSmt.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r text-slate-500 font-bold">${i+1}</td>
                <td class="p-3 border-r font-bold text-slate-800 text-center">${s}</td>
                <td class="p-3 text-center">${badge}</td>
            </tr>
        `;
    });
};

window.openModalTahun = () => {
    document.getElementById('tahunId').value = '';
    document.getElementById('inputNamaTahun').value = '';
    document.getElementById('inputNamaTahun').placeholder = 'Contoh: 2026/2027';
    document.getElementById('modalTahunPelajaran').classList.remove('hidden');
};

window.simpanTahunPelajaran = async () => {
    const nama = document.getElementById('inputNamaTahun').value.trim();
    if(!nama) return alert('Nama tahun pelajaran wajib diisi!');
    if(!state.academicConfig) state.academicConfig = { years: [], activeSemester: 'Ganjil' };
    if(!state.academicConfig.years) state.academicConfig.years = [];
    if(state.academicConfig.years.find(x => x.name === nama)) return alert('Tahun pelajaran sudah ada!');
    
    state.academicConfig.years.push({ name: nama, isActive: false });
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
    closeModal('modalTahunPelajaran');
    window.renderTahunPelajaran();
};

window.setTahunAktif = async (nama) => {
    state.academicConfig.years.forEach(y => y.isActive = (y.name === nama));
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
    window.renderTahunPelajaran();
};

window.setSemesterAktif = async (nama) => {
    state.academicConfig.activeSemester = nama;
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
    window.renderTahunPelajaran();
};

window.hapusTahun = async (nama) => {
    if(!confirm("Hapus tahun ini?")) return;
    state.academicConfig.years = state.academicConfig.years.filter(x => x.name !== nama);
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
    window.renderTahunPelajaran();
};

// ==========================================
// MATA PELAJARAN
// ==========================================
window.loadMataPelajaran = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_subjects'));
        state.masterSubjects = [];
        snap.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()}));
        state.masterSubjects.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderTableMapel();
    } catch(e) { console.error(e); }
};

window.renderTableMapel = () => {
    const tb = document.getElementById('tableMapelBody');
    tb.innerHTML = '';
    if (state.masterSubjects.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data.</td></tr>';
        return;
    }
    state.masterSubjects.forEach((m) => {
        const badge = m.isActive !== false ? '<span class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>' : '<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Nonaktif</span>';
        tb.innerHTML += `
            <tr class="border-b hover:bg-slate-50 transition border-slate-100">
                <td class="p-3 text-center font-mono font-bold text-slate-600">${m.kode || '-'}</td>
                <td class="p-3 font-bold uppercase text-slate-800">${m.nama || '-'}</td>
                <td class="p-3 text-center text-sm text-slate-600">${m.kelompok || '-'}</td>
                <td class="p-3 text-center">${badge}</td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="editMapel('${m.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusMapel('${m.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>`;
    });
};

window.openModalMapel = () => {
    document.getElementById('mapelId').value = '';
    document.getElementById('inputNamaMapel').value = '';
    document.getElementById('inputKodeMapel').value = '';
    document.getElementById('inputStatusMapel').checked = true;
    document.getElementById('modalMataPelajaran').classList.remove('hidden');
};

window.simpanMapel = async () => {
    const id = document.getElementById('mapelId').value;
    const data = {
        nama: document.getElementById('inputNamaMapel').value.trim().toUpperCase(),
        kode: document.getElementById('inputKodeMapel').value.trim().toUpperCase(),
        kelompok: document.getElementById('inputKelompokMapel').value,
        isActive: document.getElementById('inputStatusMapel').checked
    };
    if(!data.nama || !data.kode) return alert("Nama dan Kode Mapel Wajib diisi!");
    try {
        if(id) await updateDoc(doc(db, 'master_subjects', id), data);
        else await addDoc(collection(db, 'master_subjects'), data);
        closeModal('modalMataPelajaran');
        loadMataPelajaran();
    } catch(e) { console.error(e); }
};

window.editMapel = (id) => {
    const m = state.masterSubjects.find(x => x.id === id);
    if(!m) return;
    document.getElementById('mapelId').value = m.id;
    document.getElementById('inputNamaMapel').value = m.nama;
    document.getElementById('inputKodeMapel').value = m.kode;
    document.getElementById('inputKelompokMapel').value = m.kelompok;
    document.getElementById('inputStatusMapel').checked = m.isActive !== false;
    document.getElementById('modalMataPelajaran').classList.remove('hidden');
};

window.hapusMapel = async (id) => {
    if(confirm("Hapus mapel ini?")) {
        await deleteDoc(doc(db, 'master_subjects', id));
        loadMataPelajaran();
    }
};

// ==========================================
// JURUSAN
// ==========================================
window.loadJurusan = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_jurusan'));
        if(!state.masterJurusan) state.masterJurusan = [];
        state.masterJurusan = [];
        snap.forEach(d => state.masterJurusan.push({id: d.id, ...d.data()}));
        state.masterJurusan.sort((a,b) => (a.kode || '').localeCompare(b.kode || ''));
        window.renderTableJurusan();
    } catch(e) { console.error(e); }
};

window.renderTableJurusan = () => {
    const tb = document.getElementById('tableJurusanBody');
    tb.innerHTML = '';
    if (!state.masterJurusan || state.masterJurusan.length === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">Belum ada data Jurusan.</td></tr>';
        return;
    }
    state.masterJurusan.forEach((j, i) => {
        tb.innerHTML += `
            <tr class="border-b transition hover:bg-slate-50 border-slate-100">
                <td class="p-3 text-center font-bold text-slate-500">${i+1}</td>
                <td class="p-3 text-center font-mono font-bold text-slate-600">${j.kode}</td>
                <td class="p-3 font-bold uppercase text-slate-800 text-left">${j.nama}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editJurusan('${j.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusJurusan('${j.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>`;
    });
};

window.openModalJurusan = () => {
    document.getElementById('jurusanId').value = '';
    document.getElementById('inputKodeJurusan').value = '';
    document.getElementById('inputNamaJurusan').value = '';
    document.getElementById('modalJurusan').classList.remove('hidden');
};

window.simpanJurusan = async () => {
    const id = document.getElementById('jurusanId').value;
    const data = {
        kode: document.getElementById('inputKodeJurusan').value.trim().toUpperCase(),
        nama: document.getElementById('inputNamaJurusan').value.trim().toUpperCase()
    };
    if(!data.kode || !data.nama) return alert("Kode dan Nama Jurusan Wajib diisi!");
    try {
        if(id) await updateDoc(doc(db, 'master_jurusan', id), data);
        else await addDoc(collection(db, 'master_jurusan'), data);
        closeModal('modalJurusan');
        loadJurusan();
    } catch(e) { console.error(e); }
};

window.editJurusan = (id) => {
    const j = state.masterJurusan.find(x => x.id === id);
    if(!j) return;
    document.getElementById('jurusanId').value = j.id;
    document.getElementById('inputKodeJurusan').value = j.kode;
    document.getElementById('inputNamaJurusan').value = j.nama;
    document.getElementById('modalJurusan').classList.remove('hidden');
};

window.hapusJurusan = async (id) => {
    if(confirm("Hapus jurusan?")) {
        await deleteDoc(doc(db, 'master_jurusan', id));
        loadJurusan();
    }
};

// ==========================================
// KELAS / ROMBEL
// ==========================================
window.loadKelas = async () => {
    try {
        try {
            const snapSiswa = await getDocs(collection(db, 'master_siswa'));
            state.masterSiswa = [];
            snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));
        } catch(errSiswa) {
            if(!state.masterSiswa) state.masterSiswa = [];
        }

        const snap = await getDocs(collection(db, 'master_kelas'));
        state.masterKelas = [];
        snap.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
        state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderTableKelas();
    } catch(e) { console.error(e); }
};

window.renderTableKelas = () => {
    const tb = document.getElementById('tableKelasBody');
    tb.innerHTML = '';
    if (!state.masterKelas || state.masterKelas.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada data Kelas / Rombel.</td></tr>';
        return;
    }
    state.masterKelas.forEach((k, i) => {
        const jml = state.masterSiswa ? state.masterSiswa.filter(s => s.kelas === k.nama).length : 0;
        tb.innerHTML += `
            <tr class="border-b transition hover:bg-slate-50 border-slate-100 border-teal-100">
                <td class="p-3 text-center border-r border-teal-100 text-slate-500 font-bold">${i+1}</td>
                <td class="p-3 font-bold uppercase border-r border-teal-100 text-slate-800">${k.nama}</td>
                <td class="p-3 font-mono text-center border-r border-teal-100 font-bold text-slate-600">${k.kode}</td>
                <td class="p-3 uppercase border-r border-teal-100 text-slate-700">${k.waliKelas || '-'}</td>
                <td class="p-3 text-center border-r border-teal-100 font-black text-blue-600">${jml}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editKelas('${k.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusKelas('${k.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>`;
    });
};

window.openModalKelas = () => {
    document.getElementById('kelasId').value = '';
    document.getElementById('inputNamaKelas').value = '';
    document.getElementById('inputKodeKelas').value = '';
    document.getElementById('inputWaliKelas').value = '';
    document.getElementById('modalKelas').classList.remove('hidden');
};

window.simpanKelas = async () => {
    const btnSimpan = document.querySelector("#modalKelas button.bg-blue-600");
    const originalText = btnSimpan ? btnSimpan.innerText : 'Simpan';
    
    const id = document.getElementById('kelasId').value;
    const data = {
        nama: document.getElementById('inputNamaKelas').value.trim().toUpperCase(),
        kode: document.getElementById('inputKodeKelas').value.trim().toUpperCase(),
        waliKelas: document.getElementById('inputWaliKelas').value.trim().toUpperCase()
    };
    if(!data.nama || !data.kode) return alert("Nama dan kode wajib diisi!");
    
    if(btnSimpan) {
        btnSimpan.innerText = "Menyimpan...";
        btnSimpan.disabled = true;
    }
    
    try {
        if(id) await updateDoc(doc(db, 'master_kelas', id), data);
        else await addDoc(collection(db, 'master_kelas'), data);
        closeModal('modalKelas');
        alert("Data Kelas / Rombel berhasil disimpan!");
        await loadKelas();
    } catch(e) { console.error(e); }
    finally { 
        if(btnSimpan) {
            btnSimpan.innerText = originalText;
            btnSimpan.disabled = false;
        } 
    }
};

window.editKelas = (id) => {
    const k = state.masterKelas.find(x => x.id === id);
    if(!k) return;
    document.getElementById('kelasId').value = k.id;
    document.getElementById('inputNamaKelas').value = k.nama;
    document.getElementById('inputKodeKelas').value = k.kode;
    document.getElementById('inputWaliKelas').value = k.waliKelas || '';
    document.getElementById('modalKelas').classList.remove('hidden');
};

window.hapusKelas = async (id) => {
    if(confirm("Hapus kelas? Pastikan tidak ada siswa di kelas ini.")) {
        await deleteDoc(doc(db, 'master_kelas', id));
        loadKelas();
    }
};

window.kenaikanKelas = () => alert("Fitur sedang disiapkan.");

// Jalankan pengecekan sesi saat file dimuat
window.checkAdminSession();

// ==========================================
// DATA EKSTRAKURIKULER & PENEMPATAN
// ==========================================
window.loadEkskul = async () => {
    try {
        // Load data Kelas untuk kebutuhan checkbox penempatan ekskul
        if(!state.masterKelas || state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        // Load data Ekskul
        const snap = await getDocs(collection(db, 'master_ekskul'));
        state.masterEkskul = [];
        snap.forEach(d => state.masterEkskul.push({id: d.id, ...d.data()}));
        state.masterEkskul.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

        // Load data Penempatan Ekskul dari Document Settings
        const penempatanSnap = await getDoc(doc(db, 'settings', 'penempatan_ekskul'));
        if(penempatanSnap.exists()) {
            state.penempatanEkskul = penempatanSnap.data();
        } else {
            state.penempatanEkskul = {};
        }

        window.renderTableEkskul();
        window.renderPenempatanEkskul();
    } catch(e) { 
        console.error("Error load ekskul:", e); 
    }
};

window.renderTableEkskul = () => {
    const tb = document.getElementById('tableEkskulBody');
    tb.innerHTML = '';
    
    if (!state.masterEkskul || state.masterEkskul.length === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500 italic">Belum ada data Ekstrakurikuler.</td></tr>';
        return;
    }
    
    state.masterEkskul.forEach((e, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-4 text-center border-r text-slate-500 font-bold">${i+1}</td>
                <td class="p-4 border-r font-bold text-slate-800 uppercase">${e.nama || '-'}</td>
                <td class="p-4 border-r text-center font-mono font-bold text-slate-600">${e.kode || '-'}</td>
                <td class="p-4 text-center space-x-1">
                    <button onclick="editEkskul('${e.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusEkskul('${e.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalEkskul = () => {
    document.getElementById('ekskulId').value = '';
    document.getElementById('inputNamaEkskul').value = '';
    document.getElementById('inputKodeEkskul').value = '';
    document.getElementById('modalEkskul').classList.remove('hidden');
};

window.simpanEkskul = async () => {
    const id = document.getElementById('ekskulId').value;
    const nama = document.getElementById('inputNamaEkskul').value.trim().toUpperCase();
    const kode = document.getElementById('inputKodeEkskul').value.trim().toUpperCase();

    if(!nama || !kode) {
        return alert("Nama dan Kode Ekskul wajib diisi!");
    }

    const data = { nama, kode };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_ekskul', id), data);
        } else {
            await addDoc(collection(db, 'master_ekskul'), data);
        }
        closeModal('modalEkskul');
        alert("Data Ekstrakurikuler berhasil disimpan!");
        loadEkskul(); 
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan data Ekstrakurikuler.");
    }
};

window.editEkskul = (id) => {
    const e = state.masterEkskul.find(x => x.id === id);
    if(!e) return;
    
    document.getElementById('ekskulId').value = e.id;
    document.getElementById('inputNamaEkskul').value = e.nama || '';
    document.getElementById('inputKodeEkskul').value = e.kode || '';
    document.getElementById('modalEkskul').classList.remove('hidden');
};

window.hapusEkskul = async (id) => {
    if(confirm("Yakin ingin menghapus Ekstrakurikuler ini?")) {
        try {
            await deleteDoc(doc(db, 'master_ekskul', id));
            loadEkskul(); 
        } catch(e) {
            console.error(e);
        }
    }
};

// --- FUNGSI UNTUK PENEMPATAN EKSKUL ---
window.renderPenempatanEkskul = () => {
    const container = document.getElementById('containerPenempatanEkskul');
    container.innerHTML = '';
    
    if (!state.masterEkskul || state.masterEkskul.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic p-2 border rounded bg-white">Tambahkan data ekstrakurikuler terlebih dahulu.</p>';
        return;
    }

    if (!state.masterKelas || state.masterKelas.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic p-2 border rounded bg-white">Data Kelas masih kosong. Tambahkan kelas terlebih dahulu agar bisa diatur penempatannya.</p>';
        return;
    }

    state.masterEkskul.forEach(e => {
        let options = '';
        state.masterKelas.forEach(k => {
            const isChecked = state.penempatanEkskul[e.id] && state.penempatanEkskul[e.id].includes(k.nama) ? 'checked' : '';
            options += `
                <label class="flex items-center gap-2 text-sm cursor-pointer hover:bg-blue-50 p-1.5 rounded transition border border-transparent hover:border-blue-100">
                    <input type="checkbox" class="cb-penempatan-${e.id} accent-blue-600 w-4 h-4 rounded" value="${k.nama}" ${isChecked}>
                    <span class="font-bold text-slate-700">${k.nama}</span>
                </label>
            `;
        });

        container.innerHTML += `
            <div class="border border-slate-200 rounded-lg p-4 bg-white shadow-sm mb-3">
                <p class="font-black text-blue-800 text-sm mb-3 border-b border-slate-100 pb-2 uppercase">${e.nama} (${e.kode})</p>
                <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    ${options}
                </div>
            </div>
        `;
    });
};

window.simpanPenempatanEkskul = async () => {
    if (!state.masterEkskul) return;
    
    // Cari tombol simpannya dan beri efek loading
    const btn = document.querySelector('button[onclick="simpanPenempatanEkskul()"]');
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const dataToSave = {};
    
    // Looping semua ekskul, dan ambil nilai checkbox kelas yang tercentang
    state.masterEkskul.forEach(e => {
        const checkboxes = document.querySelectorAll(`.cb-penempatan-${e.id}:checked`);
        const selectedClasses = Array.from(checkboxes).map(cb => cb.value);
        dataToSave[e.id] = selectedClasses;
    });

    try {
        await setDoc(doc(db, 'settings', 'penempatan_ekskul'), dataToSave);
        state.penempatanEkskul = dataToSave;
        alert("Penempatan Kelas Ekskul berhasil disimpan!");
    } catch(error) {
        console.error("Gagal simpan penempatan:", error);
        alert("Gagal menyimpan penempatan ekskul.");
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

// ==========================================
// DATA MASTER GURU
// ==========================================
window.loadGuru = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_guru'));
        state.masterGuru = [];
        snap.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        
        // Urutkan berdasarkan nama
        state.masterGuru.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderGridGuru();
    } catch(e) {
        console.error("Error load guru:", e);
    }
};

window.renderGridGuru = () => {
    const container = document.getElementById('gridGuruContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!state.masterGuru || state.masterGuru.length === 0) {
        container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada data guru. Klik tombol + Tambah untuk memasukkan data.</div>';
        return;
    }

    state.masterGuru.forEach((g) => {
        // Penanda status aktif / nonaktif
        const badgeAktif = g.isActive !== false 
            ? `<span class="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Aktif</span>` 
            : `<span class="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Nonaktif</span>`;
            
        container.innerHTML += `
            <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative transition hover:shadow-md">
                <div class="h-1 w-full bg-blue-500 absolute top-0 left-0"></div>
                <div class="p-5 flex gap-4 mt-1 items-center">
                    <div class="w-[70px] h-[70px] rounded-full border-2 border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-4xl shadow-inner">👨‍🏫</div>
                    <div class="flex-1">
                        <p class="text-[11px] text-slate-500 tracking-wider font-mono">${g.nip || '-'}</p>
                        <h4 class="font-bold text-[15px] text-slate-800 uppercase mt-0.5 leading-tight line-clamp-2">${g.nama || '-'}</h4>
                        <p class="text-[10px] text-blue-600 font-bold uppercase mt-1 mb-2">${g.jabatan || 'Guru Kelas'}</p>
                        <div>${badgeAktif}</div>
                    </div>
                </div>
                <div class="px-4 pb-4 pt-3 flex justify-between items-center gap-2 border-t border-slate-100 bg-slate-50/50 mt-1">
                    <div class="flex gap-2">
                        <button onclick="editGuru('${g.id}')" class="text-blue-600 bg-white border border-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow-sm">✏️ Profile</button>
                        <button onclick="editJabatanGuru('${g.id}')" class="text-blue-600 bg-white border border-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow-sm">✏️ Jabatan</button>
                    </div>
                    <button onclick="hapusGuru('${g.id}')" class="text-red-500 bg-white border border-red-300 hover:bg-red-50 hover:border-red-500 px-3 py-1.5 rounded text-xs transition shadow-sm">🗑️</button>
                </div>
            </div>
        `;
    });
};

window.openModalGuru = () => {
    document.getElementById('guruId').value = '';
    document.getElementById('guruNip').value = '';
    document.getElementById('guruKode').value = '';
    document.getElementById('guruNama').value = '';
    document.getElementById('guruUsername').value = '';
    document.getElementById('guruPassword').value = '';
    document.getElementById('guruStatus').checked = true;
    document.getElementById('modalGuru').classList.remove('hidden');
};

window.simpanGuru = async () => {
    const id = document.getElementById('guruId').value;
    const nip = document.getElementById('guruNip').value.trim();
    const nama = document.getElementById('guruNama').value.trim().toUpperCase();
    
    if(!nip || !nama) return alert("NIP/NUPTK dan Nama Lengkap wajib diisi!");
    
    // Terapkan indikator tombol loading
    const btn = document.querySelector("#modalGuru button.bg-blue-600");
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const data = { 
        nip, 
        kode: document.getElementById('guruKode').value.trim().toUpperCase(), 
        nama, 
        // Jika username/password tidak diisi, gunakan NIP sebagai bawaan
        username: document.getElementById('guruUsername').value.trim().toLowerCase() || nip, 
        password: document.getElementById('guruPassword').value.trim() || nip, 
        isActive: document.getElementById('guruStatus').checked 
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_guru', id), data);
        } else {
            // Default jabatan untuk guru baru
            data.jabatan = 'GURU KELAS';
            await addDoc(collection(db, 'master_guru'), data);
        }
        
        closeModal('modalGuru');
        alert("Data Guru berhasil disimpan!");
        loadGuru(); // Muat ulang grid
    } catch(e) {
        alert("Gagal menyimpan data guru.");
        console.error(e);
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

window.editGuru = (id) => {
    const g = state.masterGuru.find(x => x.id === id);
    if(!g) return;
    
    document.getElementById('guruId').value = g.id;
    document.getElementById('guruNip').value = g.nip || '';
    document.getElementById('guruKode').value = g.kode || '';
    document.getElementById('guruNama').value = g.nama || '';
    document.getElementById('guruUsername').value = g.username || '';
    document.getElementById('guruPassword').value = g.password || '';
    document.getElementById('guruStatus').checked = g.isActive !== false;
    document.getElementById('modalGuru').classList.remove('hidden');
};

window.hapusGuru = async (id) => {
    if(confirm("Yakin ingin menghapus data guru ini? Data yang terhapus tidak dapat dikembalikan.")) {
        try {
            await deleteDoc(doc(db, 'master_guru', id));
            loadGuru(); // Muat ulang grid setelah terhapus
        } catch(e) {
            console.error(e);
            alert("Gagal menghapus data guru.");
        }
    }
};

// Fitur cepat untuk langsung mengubah jabatan via popup konfirmasi
window.editJabatanGuru = async (id) => {
    const g = state.masterGuru.find(x => x.id === id);
    if(!g) return;
    
    const jabatanBaru = prompt(`Masukkan Jabatan untuk ${g.nama}\n(Contoh: Wali Kelas 5A, Guru PAI, dll):`, g.jabatan || "Guru Kelas");
    
    if(jabatanBaru !== null && jabatanBaru.trim() !== "") {
        try {
            await updateDoc(doc(db, 'master_guru', id), { jabatan: jabatanBaru.toUpperCase() });
            loadGuru();
        } catch(e) {
            console.error(e);
            alert("Gagal merubah jabatan.");
        }
    }
};
