import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// SESSION & UTILS
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

window.switchTab = (tabId, title) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById('currentTabTitle').innerText = title;

    // Trigger loader data sesuai tab
    if (tabId === 'viewDashboard') loadDashboard();
    if (tabId === 'viewAkademik') loadAkademik();
    if (tabId === 'viewMapel') loadMataPelajaran();
    if (tabId === 'viewJurusan') loadJurusan();
    if (tabId === 'viewKelas') loadKelas();
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

// ==========================================
// DASHBOARD
// ==========================================
window.loadDashboard = async () => {
    try {
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        const snapMapel = await getDocs(collection(db, 'master_subjects'));
        const snapKelas = await getDocs(collection(db, 'master_kelas'));
        const snapUjian = await getDocs(collection(db, 'exam_schedules'));

        document.getElementById('statSiswa').innerText = snapSiswa.size;
        document.getElementById('statMapel').innerText = snapMapel.size;
        document.getElementById('statKelas').innerText = snapKelas.size;
        document.getElementById('statUjian').innerText = snapUjian.size;
    } catch (e) { console.error(e); }
};

// ==========================================
// AKADEMIK (TAHUN & SEMESTER)
// ==========================================
window.loadAkademik = async () => {
    try {
        const docRef = doc(db, 'settings', 'academic_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            state.academicConfig = docSnap.data();
        }
        window.renderTahunPelajaran();
    } catch (e) { console.error(e); }
};

window.renderTahunPelajaran = () => {
    const tb = document.getElementById('tableTahunBody');
    const sem = document.getElementById('statusSemesterAktif');
    tb.innerHTML = '';
    
    sem.innerText = state.academicConfig.activeSemester || 'Ganjil';
    
    state.academicConfig.years.forEach(y => {
        const status = y.isActive 
            ? '<span class="bg-green-500 text-white px-2 py-1 rounded text-xs">Aktif</span>' 
            : '<button onclick="setTahunAktif(\''+y.name+'\')" class="text-blue-600 hover:underline text-xs">Set Aktif</button>';
        
        tb.innerHTML += `
            <tr class="border-b">
                <td class="p-2">${y.name}</td>
                <td class="p-2 text-center">${status}</td>
                <td class="p-2 text-center">
                    <button onclick="hapusTahun(\''+y.name+'\')" class="text-red-500">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.tambahTahun = async () => {
    const nama = prompt("Masukkan Tahun Pelajaran (Contoh: 2025/2026):");
    if(!nama) return;
    state.academicConfig.years.push({ name: nama, isActive: false });
    await setDoc(doc(db, 'settings', 'academic_config'), state.academicConfig);
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
        const badge = m.isActive !== false ? '<span class="bg-green-500 text-white px-2 py-0.5 rounded text-[10px]">Aktif</span>' : '<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px]">Nonaktif</span>';
        tb.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 text-center font-mono font-bold">${m.kode || '-'}</td>
                <td class="p-3 font-bold uppercase">${m.nama || '-'}</td>
                <td class="p-3 text-center text-sm">${m.kelompok || '-'}</td>
                <td class="p-3 text-center">${badge}</td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="editMapel('${m.id}')" class="text-amber-600 font-bold">✏️</button>
                    <button onclick="hapusMapel('${m.id}')" class="text-red-500">🗑️</button>
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
    if(!data.nama || !data.kode) return alert("Wajib diisi!");
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
        state.masterJurusan = [];
        snap.forEach(d => state.masterJurusan.push({id: d.id, ...d.data()}));
        window.renderTableJurusan();
    } catch(e) { console.error(e); }
};

window.renderTableJurusan = () => {
    const tb = document.getElementById('tableJurusanBody');
    tb.innerHTML = '';
    state.masterJurusan.forEach((j, i) => {
        tb.innerHTML += `
            <tr class="border-b">
                <td class="p-3 text-center">${i+1}</td>
                <td class="p-3 text-center font-mono">${j.kode}</td>
                <td class="p-3 font-bold uppercase">${j.nama}</td>
                <td class="p-3 text-center">
                    <button onclick="editJurusan('${j.id}')" class="text-amber-600">✏️</button>
                    <button onclick="hapusJurusan('${j.id}')" class="text-red-500 ml-2">🗑️</button>
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
    try {
        if(id) await updateDoc(doc(db, 'master_jurusan', id), data);
        else await addDoc(collection(db, 'master_jurusan'), data);
        closeModal('modalJurusan');
        loadJurusan();
    } catch(e) { console.error(e); }
};

window.editJurusan = (id) => {
    const j = state.masterJurusan.find(x => x.id === id);
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
        // Load siswa dulu untuk hitung jumlah
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

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
    state.masterKelas.forEach((k, i) => {
        const jml = state.masterSiswa.filter(s => s.kelas === k.nama).length;
        tb.innerHTML += `
            <tr class="border-b">
                <td class="p-3 text-center">${i+1}</td>
                <td class="p-3 font-bold uppercase">${k.nama}</td>
                <td class="p-3 font-mono text-center">${k.kode}</td>
                <td class="p-3 uppercase">${k.waliKelas || '-'}</td>
                <td class="p-3 text-center font-bold text-blue-600">${jml}</td>
                <td class="p-3 text-center">
                    <button onclick="editKelas('${k.id}')" class="text-amber-600">✏️</button>
                    <button onclick="hapusKelas('${k.id}')" class="text-red-500 ml-2">🗑️</button>
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
    const id = document.getElementById('kelasId').value;
    const btn = document.querySelector("#modalKelas button.bg-blue-600");
    const data = {
        nama: document.getElementById('inputNamaKelas').value.trim().toUpperCase(),
        kode: document.getElementById('inputKodeKelas').value.trim().toUpperCase(),
        waliKelas: document.getElementById('inputWaliKelas').value.trim().toUpperCase()
    };
    if(!data.nama || !data.kode) return alert("Isi nama dan kode!");
    
    if(btn) btn.disabled = true;
    try {
        if(id) await updateDoc(doc(db, 'master_kelas', id), data);
        else await addDoc(collection(db, 'master_kelas'), data);
        closeModal('modalKelas');
        loadKelas();
    } catch(e) { console.error(e); }
    finally { if(btn) btn.disabled = false; }
};

window.editKelas = (id) => {
    const k = state.masterKelas.find(x => x.id === id);
    document.getElementById('kelasId').value = k.id;
    document.getElementById('inputNamaKelas').value = k.nama;
    document.getElementById('inputKodeKelas').value = k.kode;
    document.getElementById('inputWaliKelas').value = k.waliKelas || '';
    document.getElementById('modalKelas').classList.remove('hidden');
};

window.hapusKelas = async (id) => {
    if(confirm("Hapus kelas?")) {
        await deleteDoc(doc(db, 'master_kelas', id));
        loadKelas();
    }
};

window.kenaikanKelas = () => alert("Fitur sedang disiapkan.");

// Jalankan pengecekan sesi saat file dimuat
window.checkAdminSession();
