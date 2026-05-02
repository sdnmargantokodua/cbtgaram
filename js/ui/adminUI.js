import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
// Tambahkan baris impor ini untuk memanggil Firebase Auth
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

window.handleLogin = async (e) => { 
    e.preventDefault(); 
    
    // Sembunyikan pesan error jika sebelumnya muncul
    document.getElementById('loginError').classList.add('hidden'); 
    
    // Ambil data yang diketik
    let inputUser = document.getElementById('adminUsername').value.trim();
    const inputPass = document.getElementById('adminPassword').value.trim();
    const btnMasuk = document.getElementById('btnMasukAdmin');

    if (!inputUser || !inputPass) {
        return alert("Username dan Sandi tidak boleh kosong!");
    }

    // Trik Cerdas: Jika user mengetik 'admin', kita ubah otomatis jadi 'admin@garam.cbt'
    // agar diterima oleh standar keamanan Firebase Auth
    if (!inputUser.includes('@')) {
        inputUser = inputUser + '@cbt.local';
    }

    // Beri efek loading pada tombol
    const originalText = btnMasuk.innerText;
    btnMasuk.innerText = "Memeriksa Keamanan...";
    btnMasuk.disabled = true;

    try {
        const auth = getAuth();
        
        // Memanggil fungsi verifikasi bawaan Firebase Auth
        await signInWithEmailAndPassword(auth, inputUser, inputPass);

        // Jika baris di atas berhasil lolos tanpa error, berarti login valid!
        localStorage.setItem('admin_logged_in', 'true');
        checkAdminSession(); 
    } catch (error) {
        console.error("Gagal login:", error.code);
        
        // Tampilkan tulisan merah di bawah inputan password
        const errElement = document.getElementById('loginError');
        errElement.classList.remove('hidden'); 
        
        // Custom pesan error berdasarkan penolakan Firebase
        if(error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errElement.innerText = "Username atau Sandi Salah/Tidak Terdaftar!";
        } else if (error.code === 'auth/too-many-requests') {
            errElement.innerText = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
        } else {
            errElement.innerText = "Gagal menghubungi server otentikasi.";
        }
    } finally {
        // Kembalikan tombol seperti semula
        btnMasuk.innerText = originalText;
        btnMasuk.disabled = false;
    }
};

window.logoutAdmin = async () => {
    try {
        const auth = getAuth();
        await signOut(auth); // Putuskan sesi aman di server Firebase
        localStorage.removeItem('admin_logged_in');
        location.reload();
    } catch (e) {
        console.error("Logout gagal:", e);
        alert("Terjadi kesalahan saat logout.");
    }
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

    // Tambahkan baris ini di dalam fungsi window.switchTab Anda
if(id === 'viewCetak') window.loadCetak();
};

// ==========================================
// DASHBOARD
// ==========================================
window.loadDashboard = async () => {
    try {
        // Ambil Data Master Umum
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        const snapMapel = await getDocs(collection(db, 'master_subjects'));
        const snapKelas = await getDocs(collection(db, 'master_kelas'));
        const snapGuru = await getDocs(collection(db, 'master_guru'));

        // Update ID Master
        if(document.getElementById('dashSiswa')) document.getElementById('dashSiswa').innerText = snapSiswa.size;
        if(document.getElementById('dashRombel')) document.getElementById('dashRombel').innerText = snapKelas.size;
        if(document.getElementById('dashGuru')) document.getElementById('dashGuru').innerText = snapGuru.size;
        if(document.getElementById('dashMapel')) document.getElementById('dashMapel').innerText = snapMapel.size;

        // Ambil Data Statistik Penilaian
        const snapRuang = await getDocs(collection(db, 'master_ruang_ujian'));
        const snapSesi = await getDocs(collection(db, 'master_sesi_ujian'));
        const snapBankSoal = await getDocs(collection(db, 'master_bank_soal'));
        const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
        const snapToken = await getDoc(doc(db, 'settings', 'token_ujian'));

        // Update ID Penilaian
        if(document.getElementById('dashRuang')) document.getElementById('dashRuang').innerText = snapRuang.size;
        if(document.getElementById('dashSesi')) document.getElementById('dashSesi').innerText = snapSesi.size;
        if(document.getElementById('dashBankSoal')) document.getElementById('dashBankSoal').innerText = snapBankSoal.size;
        if(document.getElementById('dashJadwal')) document.getElementById('dashJadwal').innerText = snapJadwal.size;
        
        // Menampilkan Token yang Sedang Aktif
        if(document.getElementById('dashToken') && snapToken.exists()) {
            document.getElementById('dashToken').innerText = snapToken.data().currentToken || '-';
        }

        // Tampilkan teks pengumuman ke widget dashboard
        if (typeof window.loadPengumuman === 'function') {
            window.loadPengumuman(true);
        }

// Update Widget Aktivitas Terkini
const dashActivity = document.getElementById('dashActivity');
if (dashActivity) {
    let activityHtml = '';
    
    // 1. Cek Siswa yang sedang login / mengerjakan ujian
    const siswaOnline = snapSiswa.docs.filter(d => d.data().isOnline === true).length;
    if (siswaOnline > 0) {
        activityHtml += `
            <div class="p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-800 flex items-center gap-3 shadow-sm">
                <span class="relative flex h-3 w-3">
                  <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                </span> 
                <b>${siswaOnline} Siswa</b> sedang online / mengerjakan ujian.
            </div>`;
    }
    
    // 2. Cek jumlah jadwal yang sedang berstatus AKTIF
    const jadwalAktif = snapJadwal.docs.filter(d => d.data().isActive === true).length;
    activityHtml += `
        <div class="p-3 bg-emerald-50 border border-emerald-100 rounded text-sm text-emerald-800 shadow-sm flex items-center gap-2">
            ✅ Terdapat <b>${jadwalAktif} Jadwal</b> penilaian yang sedang aktif dibuka.
        </div>`;
        
    dashActivity.innerHTML = activityHtml || '<div class="text-sm text-slate-500 italic p-4 text-center">Sistem berjalan normal. Tidak ada aktivitas khusus saat ini.</div>';
}

    } catch (e) { 
        console.error("Error load dashboard:", e); 
    }
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
                        <!-- PERUBAHAN: Menghapus class uppercase di tag h4 bawah ini -->
                        <h4 class="font-bold text-[15px] text-slate-800 mt-0.5 leading-tight line-clamp-2">${g.nama || '-'}</h4>
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
    const nama = document.getElementById('guruNama').value.trim();
    
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

// ==========================================
// DATA MASTER SISWA
// ==========================================
window.loadSiswa = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snap.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        // Urutkan berdasarkan Kelas terlebih dahulu, lalu Nama
        state.masterSiswa.sort((a,b) => {
            if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
            return (a.kelas || '').localeCompare(b.kelas || '');
        });

        window.renderTableSiswa();
    } catch(e) {
        console.error("Error load siswa:", e);
    }
};

window.renderTableSiswa = () => {
    const tb = document.getElementById('tableSiswaBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!state.masterSiswa || state.masterSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data siswa. Klik tombol + Tambah Siswa.</td></tr>';
        return;
    }

    state.masterSiswa.forEach((s, i) => {
        const avatar = s.jk === 'P' ? '👩' : '👦';
        const colorJk = s.jk === 'P' ? 'bg-pink-500' : 'bg-blue-500';
        const badgeAktif = s.isActive !== false 
            ? `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>` 
            : `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Nonaktif</span>`;

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="w-4 h-4 rounded text-blue-600"></td>
                <td class="p-3 text-center font-bold text-slate-500 border-r">${i+1}</td>
                <td class="p-3 border-r">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 bg-slate-200 rounded-full flex justify-center items-center text-2xl border border-slate-300 shadow-inner">${avatar}</div>
                        <div>
                            <p class="font-bold text-[15px] uppercase text-slate-800">${s.nama || '-'}</p>
                            <div class="flex gap-1 mt-1">
                                <span class="bg-teal-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">KELAS ${s.kelas || '-'}</span>
                                <span class="${colorJk} text-white px-2 py-0.5 rounded text-[10px] font-bold">${s.jk || 'L'}</span>
                                ${badgeAktif}
                            </div>
                        </div>
                    </div>
                </td>
                <td class="p-3 border-r">
                    <p class="text-[11px] text-slate-500 font-bold mb-0.5">No Ujian / NIS: <span class="text-blue-600 text-sm font-black tracking-widest">${s.nis || '-'}</span></p>
                    <p class="text-[11px] text-slate-500 font-bold">NISN: <span class="text-slate-800 text-sm font-black tracking-widest">${s.nisn || '-'}</span></p>
                </td>
                <td class="p-3 text-center space-y-2">
                    <button onclick="editSiswa('${s.id}')" class="bg-amber-400 hover:bg-amber-500 w-full px-3 py-1.5 rounded text-xs font-bold transition text-slate-900 shadow-sm flex justify-center gap-1">✏️ Edit</button>
                    <button onclick="hapusSiswa('${s.id}')" class="bg-red-500 hover:bg-red-600 text-white w-full px-3 py-1.5 rounded text-xs font-bold transition shadow-sm flex justify-center gap-1">🗑️ Hapus</button>
                </td>
            </tr>
        `;
    });
};

window.openModalSiswa = () => {
    document.getElementById('siswaId').value = '';
    document.getElementById('siswaNisn').value = '';
    document.getElementById('siswaNis').value = '';
    document.getElementById('siswaNama').value = '';
    document.getElementById('siswaJk').value = 'L';
    document.getElementById('siswaKelas').value = '';
    document.getElementById('siswaUsername').value = '';
    document.getElementById('siswaPassword').value = '';
    document.getElementById('siswaStatus').checked = true;
    document.getElementById('modalSiswa').classList.remove('hidden');
};

window.simpanSiswa = async () => {
    const id = document.getElementById('siswaId').value;
    const nisn = document.getElementById('siswaNisn').value.trim();
    const nama = document.getElementById('siswaNama').value.trim().toUpperCase();
    
    if(!nisn || !nama) return alert("NISN dan Nama Lengkap wajib diisi!");
    
    const btn = document.querySelector("#modalSiswa button.bg-blue-600");
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const data = { 
        nisn, 
        nis: document.getElementById('siswaNis').value.trim(), 
        nama, 
        jk: document.getElementById('siswaJk').value, 
        kelas: document.getElementById('siswaKelas').value.trim().toUpperCase(), 
        // Jika username/password kosong, gunakan NISN sebagai default
        username: document.getElementById('siswaUsername').value.trim() || nisn, 
        password: document.getElementById('siswaPassword').value.trim() || nisn, 
        isActive: document.getElementById('siswaStatus').checked 
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_siswa', id), data);
        } else {
            await addDoc(collection(db, 'master_siswa'), data);
        }
        closeModal('modalSiswa');
        alert("Data Siswa berhasil disimpan!");
        loadSiswa(); // Muat ulang tabel
    } catch(e) {
        alert("Gagal menyimpan data siswa.");
        console.error(e);
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

window.editSiswa = (id) => {
    const s = state.masterSiswa.find(x => x.id === id);
    if(!s) return;
    
    document.getElementById('siswaId').value = s.id;
    document.getElementById('siswaNisn').value = s.nisn || '';
    document.getElementById('siswaNis').value = s.nis || '';
    document.getElementById('siswaNama').value = s.nama || '';
    document.getElementById('siswaJk').value = s.jk || 'L';
    document.getElementById('siswaKelas').value = s.kelas || '';
    document.getElementById('siswaUsername').value = s.username || '';
    document.getElementById('siswaPassword').value = s.password || '';
    document.getElementById('siswaStatus').checked = s.isActive !== false;
    document.getElementById('modalSiswa').classList.remove('hidden');
};

window.hapusSiswa = async (id) => {
    if(confirm("Yakin ingin menghapus data siswa ini?")) {
        try {
            await deleteDoc(doc(db, 'master_siswa', id));
            loadSiswa(); // Muat ulang tabel setelah dihapus
        } catch(e) {
            console.error(e);
            alert("Gagal menghapus data siswa.");
        }
    }
};

// ==========================================
// DATA JENIS UJIAN
// ==========================================
window.loadJenisUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_jenis_ujian'));
        state.masterJenisUjian = [];
        snap.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()}));

        // Generate data default jika database benar-benar kosong
        if(state.masterJenisUjian.length === 0) {
            const defaultJenis = [
                { nama: 'Penilaian Harian', kode: 'PH', noUrut: 1 },
                { nama: 'Penilaian Tengah Semester', kode: 'PTS', noUrut: 2 },
                { nama: 'Penilaian Akhir Semester', kode: 'PAS', noUrut: 3 },
                { nama: 'Penilaian Akhir Tahun', kode: 'PAT', noUrut: 4 },
                { nama: 'Ujian Sekolah Berbasis Komputer', kode: 'USBK', noUrut: 5 },
                { nama: 'Try Out', kode: 'TO', noUrut: 6 },
                { nama: 'Simulasi', kode: 'SIML', noUrut: 7 }
            ];
            
            for (const j of defaultJenis) {
                const docRef = await addDoc(collection(db, 'master_jenis_ujian'), j);
                state.masterJenisUjian.push({ id: docRef.id, ...j });
            }
        }

        // Urutkan berdasarkan noUrut
        state.masterJenisUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableJenisUjian();
    } catch(e) {
        console.error("Error load jenis ujian:", e);
    }
};

window.renderTableJenisUjian = () => {
    const tb = document.getElementById('tableJenisUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (state.masterJenisUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data Jenis Ujian.</td></tr>';
        return;
    }

    state.masterJenisUjian.forEach((ju, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase">${ju.nama || '-'}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-blue-700">${ju.kode || '-'}</td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="editJenisUjian('${ju.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusJenisUjian('${ju.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalJenisUjian = () => {
    document.getElementById('jenisUjianId').value = '';
    document.getElementById('inputNamaJenisUjian').value = '';
    document.getElementById('inputKodeJenisUjian').value = '';
    document.getElementById('modalJenisUjian').classList.remove('hidden');
};

window.simpanJenisUjian = async () => {
    const id = document.getElementById('jenisUjianId').value;
    const nama = document.getElementById('inputNamaJenisUjian').value.trim();
    const kode = document.getElementById('inputKodeJenisUjian').value.trim().toUpperCase();

    if(!nama || !kode) {
        return alert("Nama dan Kode Jenis Ujian wajib diisi!");
    }

    const btn = document.querySelector("#modalJenisUjian button.bg-blue-600");
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const data = { 
        nama, 
        kode, 
        noUrut: id ? (state.masterJenisUjian.find(x => x.id === id)?.noUrut || state.masterJenisUjian.length + 1) : state.masterJenisUjian.length + 1 
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_jenis_ujian', id), data);
        } else {
            await addDoc(collection(db, 'master_jenis_ujian'), data);
        }
        closeModal('modalJenisUjian');
        alert("Data Jenis Ujian berhasil disimpan!");
        loadJenisUjian(); // Muat ulang tabel
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan data.");
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

window.editJenisUjian = (id) => {
    const ju = state.masterJenisUjian.find(x => x.id === id);
    if(!ju) return;

    document.getElementById('jenisUjianId').value = ju.id;
    document.getElementById('inputNamaJenisUjian').value = ju.nama || '';
    document.getElementById('inputKodeJenisUjian').value = ju.kode || '';
    document.getElementById('modalJenisUjian').classList.remove('hidden');
};

window.hapusJenisUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Jenis Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_jenis_ujian', id));
            loadJenisUjian();
        } catch(e) {
            console.error(e);
            alert("Gagal menghapus data.");
        }
    }
};

// ==========================================
// DATA SESI UJIAN
// ==========================================
window.loadSesiUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_sesi_ujian'));
        state.masterSesiUjian = [];
        snap.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));

        // Generate data default jika database masih kosong
        if(state.masterSesiUjian.length === 0) {
            const defaultSesi = [
                { nama: 'Sesi 1', kode: 'S1', waktuMulai: '07:30:00', waktuSelesai: '09:30:00', noUrut: 1 },
                { nama: 'Sesi 2', kode: 'S2', waktuMulai: '10:00:00', waktuSelesai: '12:00:00', noUrut: 2 }
            ];
            
            for (const s of defaultSesi) {
                const docRef = await addDoc(collection(db, 'master_sesi_ujian'), s);
                state.masterSesiUjian.push({ id: docRef.id, ...s });
            }
        }

        // Urutkan berdasarkan noUrut
        state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableSesiUjian();
    } catch(e) {
        console.error("Error load sesi ujian:", e);
    }
};

window.renderTableSesiUjian = () => {
    const tb = document.getElementById('tableSesiUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (state.masterSesiUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada data Sesi Ujian.</td></tr>';
        return;
    }

    state.masterSesiUjian.forEach((s, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase">${s.nama || '-'}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-blue-700">${s.kode || '-'}</td>
                <td class="p-3 border-r text-center font-mono text-slate-600 font-bold">${s.waktuMulai || '-'} <span class="text-xs font-normal px-1">s/d</span> ${s.waktuSelesai || '-'}</td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="editSesiUjian('${s.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusSesiUjian('${s.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalSesiUjian = () => {
    document.getElementById('sesiUjianId').value = '';
    document.getElementById('inputNamaSesi').value = '';
    document.getElementById('inputKodeSesi').value = '';
    document.getElementById('inputWaktuMulai').value = '07:30:00';
    document.getElementById('inputWaktuSelesai').value = '09:30:00';
    document.getElementById('modalSesiUjian').classList.remove('hidden');
};

window.simpanSesiUjian = async () => {
    const id = document.getElementById('sesiUjianId').value;
    const nama = document.getElementById('inputNamaSesi').value.trim();
    const kode = document.getElementById('inputKodeSesi').value.trim().toUpperCase();
    const waktuMulai = document.getElementById('inputWaktuMulai').value;
    const waktuSelesai = document.getElementById('inputWaktuSelesai').value;

    if(!nama || !kode) {
        return alert("Nama dan Kode Sesi wajib diisi!");
    }

    const btn = document.querySelector("#modalSesiUjian button.bg-blue-600");
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const data = { 
        nama, 
        kode, 
        waktuMulai,
        waktuSelesai,
        noUrut: id ? (state.masterSesiUjian.find(x => x.id === id)?.noUrut || state.masterSesiUjian.length + 1) : state.masterSesiUjian.length + 1 
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_sesi_ujian', id), data);
        } else {
            await addDoc(collection(db, 'master_sesi_ujian'), data);
        }
        closeModal('modalSesiUjian');
        alert("Data Sesi Ujian berhasil disimpan!");
        loadSesiUjian(); // Muat ulang tabel
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan data.");
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

window.editSesiUjian = (id) => {
    const s = state.masterSesiUjian.find(x => x.id === id);
    if(!s) return;

    document.getElementById('sesiUjianId').value = s.id;
    document.getElementById('inputNamaSesi').value = s.nama || '';
    document.getElementById('inputKodeSesi').value = s.kode || '';
    document.getElementById('inputWaktuMulai').value = s.waktuMulai || '';
    document.getElementById('inputWaktuSelesai').value = s.waktuSelesai || '';
    document.getElementById('modalSesiUjian').classList.remove('hidden');
};

window.hapusSesiUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Sesi Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_sesi_ujian', id));
            loadSesiUjian();
        } catch(e) {
            console.error(e);
            alert("Gagal menghapus data.");
        }
    }
};

// ==========================================
// DATA RUANG UJIAN
// ==========================================
window.loadRuangUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_ruang_ujian'));
        state.masterRuangUjian = [];
        snap.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));

        // Generate data default jika database masih kosong
        if(state.masterRuangUjian.length === 0) {
            const defaultRuang = [
                { nama: 'Ruang 1', kode: 'R1', jumSesi: 2, noUrut: 1 },
                { nama: 'Ruang 2', kode: 'R2', jumSesi: 2, noUrut: 2 },
                { nama: 'Ruang 3', kode: 'R3', jumSesi: 2, noUrut: 3 }
            ];
            
            for (const r of defaultRuang) {
                const docRef = await addDoc(collection(db, 'master_ruang_ujian'), r);
                state.masterRuangUjian.push({ id: docRef.id, ...r });
            }
        }

        // Urutkan berdasarkan noUrut
        state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableRuangUjian();
    } catch(e) {
        console.error("Error load ruang ujian:", e);
    }
};

window.renderTableRuangUjian = () => {
    const tb = document.getElementById('tableRuangUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (state.masterRuangUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada data Ruang Ujian.</td></tr>';
        return;
    }

    state.masterRuangUjian.forEach((r, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase">${r.nama || '-'}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-blue-700">${r.kode || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">${r.jumSesi || '0'} Sesi</td>
                <td class="p-3 text-center space-x-2">
                    <button onclick="editRuangUjian('${r.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusRuangUjian('${r.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalRuangUjian = () => {
    document.getElementById('ruangUjianId').value = '';
    document.getElementById('inputNamaRuang').value = '';
    document.getElementById('inputKodeRuang').value = '';
    document.getElementById('inputJumSesi').value = '1';
    document.getElementById('modalRuangUjian').classList.remove('hidden');
};

window.simpanRuangUjian = async () => {
    const id = document.getElementById('ruangUjianId').value;
    const nama = document.getElementById('inputNamaRuang').value.trim();
    const kode = document.getElementById('inputKodeRuang').value.trim().toUpperCase();
    const jumSesi = parseInt(document.getElementById('inputJumSesi').value) || 1;

    if(!nama || !kode) {
        return alert("Nama dan Kode Ruang wajib diisi!");
    }

    const btn = document.querySelector("#modalRuangUjian button.bg-blue-600");
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const data = { 
        nama, 
        kode, 
        jumSesi,
        noUrut: id ? (state.masterRuangUjian.find(x => x.id === id)?.noUrut || state.masterRuangUjian.length + 1) : state.masterRuangUjian.length + 1 
    };

    try {
        if(id) {
            await updateDoc(doc(db, 'master_ruang_ujian', id), data);
        } else {
            await addDoc(collection(db, 'master_ruang_ujian'), data);
        }
        closeModal('modalRuangUjian');
        alert("Data Ruang Ujian berhasil disimpan!");
        loadRuangUjian(); // Muat ulang tabel
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan data.");
    } finally {
        if(btn) { btn.innerText = "Simpan"; btn.disabled = false; }
    }
};

window.editRuangUjian = (id) => {
    const r = state.masterRuangUjian.find(x => x.id === id);
    if(!r) return;

    document.getElementById('ruangUjianId').value = r.id;
    document.getElementById('inputNamaRuang').value = r.nama || '';
    document.getElementById('inputKodeRuang').value = r.kode || '';
    document.getElementById('inputJumSesi').value = r.jumSesi || 1;
    document.getElementById('modalRuangUjian').classList.remove('hidden');
};

window.hapusRuangUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Ruang Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_ruang_ujian', id));
            loadRuangUjian();
        } catch(e) {
            console.error(e);
            alert("Gagal menghapus data.");
        }
    }
};

// ==========================================
// ATUR RUANG & SESI SISWA
// ==========================================
window.loadAturRuangSesi = async () => {
    try {
        // 1. Load Data Kelas
        if (!state.masterKelas || state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        // 2. Load Data Ruang
        if (!state.masterRuangUjian || state.masterRuangUjian.length === 0) {
            const snapRuang = await getDocs(collection(db, 'master_ruang_ujian'));
            state.masterRuangUjian = [];
            snapRuang.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));
            state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        // 3. Load Data Sesi
        if (!state.masterSesiUjian || state.masterSesiUjian.length === 0) {
            const snapSesi = await getDocs(collection(db, 'master_sesi_ujian'));
            state.masterSesiUjian = [];
            snapSesi.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));
            state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        // 4. Load Data Siswa
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        // 5. Render Dropdown Filter Kelas
        const filterKelas = document.getElementById('filterKelasAtur');
        filterKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        state.masterKelas.forEach(k => {
            filterKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`;
        });

        // 6. Render Dropdown Bulk Action (Ruang & Sesi)
        const bulkRuang = document.getElementById('bulkRuang');
        bulkRuang.innerHTML = '<option value="">Pilih ruang</option>';
        state.masterRuangUjian.forEach(r => {
            bulkRuang.innerHTML += `<option value="${r.nama}">${r.nama}</option>`;
        });

        const bulkSesi = document.getElementById('bulkSesi');
        bulkSesi.innerHTML = '<option value="">Pilih sesi</option>';
        state.masterSesiUjian.forEach(s => {
            bulkSesi.innerHTML += `<option value="${s.nama}">${s.nama}</option>`;
        });

        // Otomatis pilih kelas pertama jika ada
        if(state.masterKelas.length > 0) {
            filterKelas.value = state.masterKelas[0].nama;
        }

        window.renderTableAturRuangSesi();
    } catch(e) {
        console.error("Error load atur ruang sesi:", e);
    }
};

window.renderTableAturRuangSesi = () => {
    const kelasVal = document.getElementById('filterKelasAtur').value;
    const tb = document.getElementById('tableAturRuangSesiBody');
    const lbl = document.getElementById('labelBulkAction');
    
    tb.innerHTML = '';
    lbl.innerText = `Gabungkan siswa ${kelasVal ? kelasVal : ''} ke ruang dan sesi:`;
    
    if (!kelasVal) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Silakan pilih kelas terlebih dahulu.</td></tr>';
        return;
    }

    const filteredSiswa = state.masterSiswa.filter(s => s.kelas === kelasVal).sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    
    if (filteredSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Tidak ada siswa yang terdaftar di kelas ini.</td></tr>';
        return;
    }

    // Siapkan element option HTML untuk Ruang dan Sesi
    let optRuang = '<option value="">Pilih ruang</option>';
    state.masterRuangUjian.forEach(r => { optRuang += `<option value="${r.nama}">${r.nama}</option>`; });
    
    let optSesi = '<option value="">Pilih sesi</option>';
    state.masterSesiUjian.forEach(s => { optSesi += `<option value="${s.nama}">${s.nama}</option>`; });

    // Render baris tabel untuk setiap siswa
    filteredSiswa.forEach((s, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-blue-50 transition border-b border-slate-100" data-id="${s.id}">
                <td class="p-3 text-center border-r text-slate-500 font-bold">${i+1}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800">${s.nama}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">${s.kelas}</td>
                <td class="p-2 border-r bg-slate-50">
                    <select class="w-full p-2 border border-slate-300 rounded outline-none select-ruang text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition">${optRuang}</select>
                </td>
                <td class="p-2 border-r bg-slate-50">
                    <select class="w-full p-2 border border-slate-300 rounded outline-none select-sesi text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition">${optSesi}</select>
                </td>
            </tr>
        `;
    });

    // Timeout kecil untuk memastikan elemen select sudah di-render ke DOM, lalu atur value (selected) sesuai data siswa
    setTimeout(() => {
        tb.querySelectorAll('tr[data-id]').forEach(row => {
            const id = row.getAttribute('data-id');
            const s = filteredSiswa.find(x => x.id === id);
            if(s) {
                if(s.ruang) row.querySelector('.select-ruang').value = s.ruang;
                if(s.sesi) row.querySelector('.select-sesi').value = s.sesi;
            }
        });
    }, 50);
};

// Fungsi Terapkan Ke Semua Siswa
window.applyBulkRuangSesi = () => {
    const ruangVal = document.getElementById('bulkRuang').value;
    const sesiVal = document.getElementById('bulkSesi').value;
    
    document.getElementById('tableAturRuangSesiBody').querySelectorAll('tr[data-id]').forEach(row => {
        if(ruangVal) row.querySelector('.select-ruang').value = ruangVal;
        if(sesiVal) row.querySelector('.select-sesi').value = sesiVal;
    });
};

window.simpanAturRuangSesi = async () => {
    const btn = document.getElementById('btnSimpanAtur');
    if (btn) { btn.disabled = true; btn.innerHTML = "Menyimpan..."; }
    
    try {
        const promises = [];
        
        document.getElementById('tableAturRuangSesiBody').querySelectorAll('tr[data-id]').forEach(row => {
            const id = row.getAttribute('data-id');
            const ruang = row.querySelector('.select-ruang').value;
            const sesi = row.querySelector('.select-sesi').value;
            
            // Update state lokal
            const s = state.masterSiswa.find(x => x.id === id);
            if(s) {
                s.ruang = ruang;
                s.sesi = sesi;
            }
            
            // Push perintah update ke array promises untuk dieksekusi secara paralel (lebih cepat)
            promises.push(updateDoc(doc(db, 'master_siswa', id), { ruang, sesi }));
        });
        
        await Promise.all(promises);
        alert("Penempatan Ruang dan Sesi berhasil disimpan!");
    } catch(e) {
        console.error("Gagal simpan ruang sesi:", e);
        alert("Gagal menyimpan data ke server.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = "💾 Simpan"; }
    }
};

// ==========================================
// ATUR PENGAWAS UJIAN
// ==========================================
window.loadPengawas = async () => {
    try {
        // 1. Load Data Jenis Ujian
        if (!state.masterJenisUjian || state.masterJenisUjian.length === 0) {
            const snapJenis = await getDocs(collection(db, 'master_jenis_ujian'));
            state.masterJenisUjian = [];
            snapJenis.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()}));
            state.masterJenisUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        // 2. Load Data Ruang Ujian
        if (!state.masterRuangUjian || state.masterRuangUjian.length === 0) {
            const snapRuang = await getDocs(collection(db, 'master_ruang_ujian'));
            state.masterRuangUjian = [];
            snapRuang.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));
            state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        // 3. Load Data Sesi Ujian
        if (!state.masterSesiUjian || state.masterSesiUjian.length === 0) {
            const snapSesi = await getDocs(collection(db, 'master_sesi_ujian'));
            state.masterSesiUjian = [];
            snapSesi.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));
            state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        // 4. Load Data Guru
        if (!state.masterGuru || state.masterGuru.length === 0) {
            const snapGuru = await getDocs(collection(db, 'master_guru'));
            state.masterGuru = [];
            snapGuru.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
            state.masterGuru.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        // 5. Load Data Penempatan Pengawas yang sudah tersimpan
        const snapPengawas = await getDoc(doc(db, 'settings', 'pengawas_ujian'));
        if (snapPengawas.exists()) {
            state.pengawasUjian = snapPengawas.data();
        } else {
            state.pengawasUjian = {};
        }

        // 6. Render Dropdown Jenis Penilaian
        const filterJenis = document.getElementById('filterPengawasJenis');
        if (state.masterJenisUjian.length > 0) {
            filterJenis.innerHTML = '<option value="">-- Pilih Jenis Penilaian --</option>';
            state.masterJenisUjian.forEach(j => {
                filterJenis.innerHTML += `<option value="${j.nama}">${j.nama}</option>`;
            });
        } else {
            filterJenis.innerHTML = '<option value="">Belum ada data Jenis Ujian</option>';
        }

        window.renderTablePengawas();
    } catch (e) {
        console.error("Error load pengawas:", e);
    }
};

window.renderTablePengawas = () => {
    const jenisVal = document.getElementById('filterPengawasJenis').value;
    const tb = document.getElementById('tablePengawasBody');
    tb.innerHTML = '';

    if (!jenisVal) {
        tb.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic bg-slate-50">Silakan Pilih Jenis Penilaian terlebih dahulu.</td></tr>';
        return;
    }

    if (!state.masterRuangUjian || state.masterRuangUjian.length === 0 || !state.masterSesiUjian || state.masterSesiUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic bg-slate-50">Data Master Ruang atau Sesi masih kosong.</td></tr>';
        return;
    }

    // Siapkan dropdown opsi Guru
    let optGuru = '<option value="">-- Pilih Pengawas --</option>';
    state.masterGuru.forEach(g => {
        optGuru += `<option value="${g.nama}">${g.nama}</option>`;
    });

    let no = 1;
    // Loop Ruang -> Loop Sesi untuk membuat matriks penempatan
    state.masterRuangUjian.forEach(r => {
        state.masterSesiUjian.forEach(s => {
            const key = `${r.nama}_${s.nama}`; // Kunci unik kombinasi ruang dan sesi
            
            tb.innerHTML += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100" data-key="${key}">
                    <td class="p-3 text-center border-r font-bold text-slate-500">${no++}</td>
                    <td class="p-3 border-r font-bold text-slate-800 uppercase">${r.nama}</td>
                    <td class="p-3 border-r text-center font-bold text-slate-600">${s.nama}</td>
                    <td class="p-2 border-r bg-slate-50">
                        <select class="w-full p-2 border border-slate-300 rounded outline-none text-sm bg-white select-guru focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition">
                            ${optGuru}
                        </select>
                    </td>
                </tr>
            `;
        });
    });

    // Timeout untuk memuat data yang sudah tersimpan ke dalam dropdown guru
    setTimeout(() => {
        tb.querySelectorAll('tr[data-key]').forEach(row => {
            const key = row.getAttribute('data-key');
            if (state.pengawasUjian[jenisVal] && state.pengawasUjian[jenisVal][key]) {
                row.querySelector('.select-guru').value = state.pengawasUjian[jenisVal][key];
            }
        });
    }, 50);
};

window.simpanPengawas = async () => {
    const jenisVal = document.getElementById('filterPengawasJenis').value;
    if (!jenisVal) return alert("Pilih Jenis Penilaian terlebih dahulu!");

    const btn = document.getElementById('btnSimpanPengawas');
    if (btn) { btn.disabled = true; btn.innerHTML = "Menyimpan..."; }

    const tb = document.getElementById('tablePengawasBody');
    const rows = tb.querySelectorAll('tr[data-key]');
    
    // Inisialisasi object untuk jenis ujian ini jika belum ada
    if (!state.pengawasUjian) state.pengawasUjian = {};
    if (!state.pengawasUjian[jenisVal]) state.pengawasUjian[jenisVal] = {};

    rows.forEach(row => {
        const key = row.getAttribute('data-key');
        const guru = row.querySelector('.select-guru').value;
        
        if (guru) {
            state.pengawasUjian[jenisVal][key] = guru;
        } else {
            // Hapus jika opsi dikosongkan
            delete state.pengawasUjian[jenisVal][key];
        }
    });

    try {
        await setDoc(doc(db, 'settings', 'pengawas_ujian'), state.pengawasUjian);
        alert(`Alokasi Pengawas untuk "${jenisVal}" berhasil disimpan!`);
    } catch (e) {
        console.error("Gagal menyimpan pengawas:", e);
        alert("Gagal menyimpan data ke server.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = "💾 Simpan"; }
    }
};

// ==========================================
// GENERATE NOMOR PESERTA UJIAN
// ==========================================
window.loadNomorPeserta = async () => {
    try {
        // 1. Load Data Kelas untuk filter dropdown
        if (state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({ id: d.id, ...d.data() }));
            state.masterKelas.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        // 2. Load Data Siswa
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({ id: d.id, ...d.data() }));

        // 3. Render Dropdown Kelas
        const selectKelas = document.getElementById('selectKelasNomor');
        if (selectKelas) {
            selectKelas.innerHTML = '<option value="ALL">Semua Kelas</option>';
            state.masterKelas.forEach(k => {
                selectKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`;
            });
        }
    } catch (e) {
        console.error("Error load nomor peserta:", e);
    }
};

window.generateNomorPeserta = async () => {
    const kelasVal = document.getElementById('selectKelasNomor').value;
    const btn = document.getElementById('btnGenerateNomor');
    const NPSN_SEKOLAH = '20528347'; // Berdasarkan data profil sekolah Anda

    let siswaTarget = [];
    if (kelasVal === 'ALL') {
        siswaTarget = [...state.masterSiswa];
    } else {
        siswaTarget = state.masterSiswa.filter(s => s.kelas === kelasVal);
    }

    if (siswaTarget.length === 0) return alert("Tidak ada data siswa untuk kelas ini!");

    // Urutkan siswa berdasarkan Kelas lalu Nama agar nomor urut rapi
    siswaTarget.sort((a, b) => {
        if (a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
        return (a.kelas || '').localeCompare(b.kelas || '');
    });

    if (!confirm(`Sistem akan men-generate ulang nomor ujian untuk ${siswaTarget.length} siswa. Lanjutkan?`)) return;

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = "Memproses...";
    }

    try {
        const promises = [];
        siswaTarget.forEach((s, index) => {
            // Format: NPSN-NomorUrut (Contoh: 20528347-001)
            const noUrut = String(index + 1).padStart(3, '0');
            const noUjianBaru = `${NPSN_SEKOLAH}-${noUrut}`;
            
            // Update nomor ujian dan juga NIS (karena NIS digunakan sebagai username login siswa)
            promises.push(updateDoc(doc(db, 'master_siswa', s.id), { 
                nis: noUjianBaru,
                noUjian: noUjianBaru 
            }));
        });

        await Promise.all(promises);
        alert("Nomor Peserta berhasil di-generate dan disimpan ke data siswa!");
        
        // Segarkan data lokal
        await loadSiswa(); 
    } catch (e) {
        console.error("Gagal generate nomor:", e);
        alert("Terjadi kesalahan saat memperbarui database.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = "💾 Simpan";
        }
    }
};

// ==========================================
// PENGATURAN TOKEN UJIAN
// ==========================================
window.loadToken = async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'token_ujian'));
        if(snap.exists()) {
            state.tokenConfig = snap.data();
        } else {
            // Inisialisasi default jika belum ada di database
            state.tokenConfig = { currentToken: '------', isAuto: false, interval: 60 };
            await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig);
        }
        window.renderTokenUI();
    } catch(e) {
        console.error("Error load token:", e);
    }
};

window.renderTokenUI = () => {
    if (!document.getElementById('tokenOtomatis')) return;
    
    document.getElementById('tokenOtomatis').value = state.tokenConfig.isAuto ? 'YA' : 'TIDAK';
    document.getElementById('tokenInterval').value = state.tokenConfig.interval || 60;
    document.getElementById('displayTokenSaatIni').innerText = state.tokenConfig.currentToken || '------';
};

window.generateNewToken = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newToken = '';
    for (let i = 0; i < 6; i++) {
        newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
        state.tokenConfig.currentToken = newToken;
        await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig);
        window.renderTokenUI();
        alert(`Token baru berhasil dibuat: ${newToken}`);
        
        // Update tampilan dashboard jika diperlukan
        if(typeof loadDashboard === 'function') loadDashboard();
    } catch(e) {
        console.error("Gagal generate token:", e);
        alert("Terjadi kesalahan saat memperbarui token.");
    }
};

window.simpanTokenSettings = async () => {
    const isAuto = document.getElementById('tokenOtomatis').value === 'YA';
    const interval = parseInt(document.getElementById('tokenInterval').value) || 60;

    try {
        state.tokenConfig.isAuto = isAuto;
        state.tokenConfig.interval = interval;
        await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig);
        alert("Pengaturan token berhasil disimpan!");
    } catch(e) {
        console.error("Gagal simpan setting token:", e);
        alert("Gagal menyimpan pengaturan.");
    }
};

// ==========================================
// PENGATURAN BANK SOAL
// ==========================================
window.loadBankSoal = async () => {
    try {
        // 1. Pastikan data pendukung Dropdown tersedia
        if (state.masterSubjects.length === 0) {
            const s1 = await getDocs(collection(db, 'master_subjects'));
            state.masterSubjects = [];
            s1.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()}));
        }
        if (state.masterGuru.length === 0) {
            const s2 = await getDocs(collection(db, 'master_guru'));
            state.masterGuru = [];
            s2.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        }
        if (state.masterKelas.length === 0) {
            const s3 = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            s3.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
        }

        // 2. Isi Dropdown di Modal Bank Soal
        const selMapel = document.getElementById('bsMapel');
        selMapel.innerHTML = '<option value="">Pilih Mapel</option>';
        state.masterSubjects.forEach(m => selMapel.innerHTML += `<option value="${m.nama}">${m.nama}</option>`);

        const selGuru = document.getElementById('bsGuru');
        selGuru.innerHTML = '<option value="">Pilih Guru Pengampu</option>';
        state.masterGuru.forEach(g => selGuru.innerHTML += `<option value="${g.nama}">${g.nama}</option>`);

        const selKelas = document.getElementById('bsKelas');
        selKelas.innerHTML = '<option value="">Pilih Kelas</option>';
        state.masterKelas.forEach(k => selKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);

        // 3. Load Data Bank Soal Utama
        const snap = await getDocs(collection(db, 'master_bank_soal'));
        state.masterBankSoal = [];
        snap.forEach(d => state.masterBankSoal.push({id: d.id, ...d.data()}));
        
        window.renderTableBankSoal();
    } catch(e) {
        console.error("Error load bank soal:", e);
    }
};

window.renderTableBankSoal = () => {
    const tb = document.getElementById('tableBankSoalBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (state.masterBankSoal.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Bank Soal. Silakan buat baru.</td></tr>';
        return;
    }

    state.masterBankSoal.forEach((b, i) => {
        const statusColor = b.isActive ? "bg-amber-400" : "bg-slate-400";
        
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-l-4 ${b.isActive ? 'border-l-amber-400' : 'border-l-slate-400'} border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 ${statusColor} rounded-full"></div>
                        <span class="font-bold text-blue-700 font-mono tracking-tight">${b.kode || '-'}</span>
                    </div>
                </td>
                <td class="p-3 border-r font-bold text-slate-800">${b.mapel || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">${b.kelas || '-'}</td>
                <td class="p-3 border-r text-center font-black text-slate-700">${b.totalSoal || 0}</td>
                <td class="p-3 text-center space-x-1 whitespace-nowrap">
                    <button onclick="bukaSoalDetail('${b.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded shadow-sm text-xs font-bold transition">📝 Soal</button>
                    <button onclick="editBankSoal('${b.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-2 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusBankSoal('${b.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.kalkulasiTotalSoalBobot = () => {
    const getVal = (id) => parseInt(document.getElementById(id).value) || 0;
    
    const tSoal = getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml');
    const tBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');
    
    document.getElementById('bsLabelTotalSoal').innerText = tSoal;
    const lblBobot = document.getElementById('bsLabelTotalBobot');
    lblBobot.innerText = tBobot + "%";
    
    // Beri peringatan merah jika total bobot bukan 100%
    if(tBobot !== 100 && tBobot !== 0) {
        lblBobot.classList.replace('text-slate-800', 'text-red-600');
    } else {
        lblBobot.classList.replace('text-red-600', 'text-slate-800');
    }
};

window.openModalBankSoal = () => {
    document.getElementById('bankSoalId').value = '';
    document.getElementById('bsKode').value = '';
    document.getElementById('bsLevel').value = '1';
    
    // Reset semua input jumlah & bobot
    ['Pg','Pgk','Bs','Isian','Uraian','Urut'].forEach(k => {
        document.getElementById(`bs${k}Jml`).value = 0;
        document.getElementById(`bs${k}Bobot`).value = 0;
    });
    
    document.getElementById('bsStatus').value = 'true';
    kalkulasiTotalSoalBobot();
    document.getElementById('modalBankSoal').classList.remove('hidden');
};

window.simpanBankSoal = async () => {
    const id = document.getElementById('bankSoalId').value;
    const kode = document.getElementById('bsKode').value.trim().toUpperCase();
    const mapel = document.getElementById('bsMapel').value;
    const kelas = document.getElementById('bsKelas').value;

    if(!kode || !mapel || !kelas) return alert("Kode, Mapel, dan Kelas wajib diisi!");

    const getVal = (idx) => parseInt(document.getElementById(idx).value) || 0;
    const totalSoal = getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml');
    const totalBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');

    if(totalBobot !== 100 && totalBobot !== 0) {
        if(!confirm("Peringatan: Total bobot tidak 100%. Lanjutkan?")) return;
    }

    const data = {
        kode, mapel, kelas, totalSoal,
        guru: document.getElementById('bsGuru').value,
        level: document.getElementById('bsLevel').value,
        isActive: document.getElementById('bsStatus').value === 'true',
        kategoriAgama: document.getElementById('bsKategori').value,
        komposisi: {
            pg: { jml: getVal('bsPgJml'), bobot: getVal('bsPgBobot'), opsi: document.getElementById('bsPgOpsi').value },
            pgk: { jml: getVal('bsPgkJml'), bobot: getVal('bsPgkBobot') },
            bs: { jml: getVal('bsBsJml'), bobot: getVal('bsBsBobot') },
            isian: { jml: getVal('bsIsianJml'), bobot: getVal('bsIsianBobot') },
            uraian: { jml: getVal('bsUraianJml'), bobot: getVal('bsUraianBobot') },
            urut: { jml: getVal('bsUrutJml'), bobot: getVal('bsUrutBobot') }
        }
    };

    const btn = document.getElementById('btnSimpanBankSoal');
    if(btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }

    try {
        if(id) await updateDoc(doc(db, 'master_bank_soal', id), data);
        else await addDoc(collection(db, 'master_bank_soal'), data);
        
        closeModal('modalBankSoal');
        alert("Pengaturan Bank Soal berhasil disimpan!");
        loadBankSoal();
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan data.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = "Simpan Bank Soal"; }
    }
};

window.editBankSoal = (id) => {
    const b = state.masterBankSoal.find(x => x.id === id);
    if(!b) return;

    document.getElementById('bankSoalId').value = b.id;
    document.getElementById('bsKode').value = b.kode || '';
    document.getElementById('bsMapel').value = b.mapel || '';
    document.getElementById('bsGuru').value = b.guru || '';
    document.getElementById('bsKelas').value = b.kelas || '';
    document.getElementById('bsLevel').value = b.level || '1';
    
    if(b.komposisi) {
        ['pg','pgk','bs','isian','uraian','urut'].forEach(k => {
            const field = k.charAt(0).toUpperCase() + k.slice(1);
            document.getElementById(`bs${field}Jml`).value = b.komposisi[k]?.jml || 0;
            document.getElementById(`bs${field}Bobot`).value = b.komposisi[k]?.bobot || 0;
        });
        document.getElementById('bsPgOpsi').value = b.komposisi.pg?.opsi || '4';
    }
    
    document.getElementById('bsKategori').value = b.kategoriAgama || 'Bukan Mapel Agama';
    document.getElementById('bsStatus').value = b.isActive ? 'true' : 'false';
    kalkulasiTotalSoalBobot();
    document.getElementById('modalBankSoal').classList.remove('hidden');
};

window.hapusBankSoal = async (id) => {
    if(confirm("Hapus Bank Soal ini? Semua butir soal di dalamnya juga akan terhapus.")) {
        try {
            await deleteDoc(doc(db, 'master_bank_soal', id));
            loadBankSoal();
        } catch(e) { console.error(e); }
    }
};

// ==========================================
// EDITOR BUTIR SOAL (ISI SOAL)
// ==========================================
state.currentButirSoal = [];
state.activeSoalId = null;

window.bukaSoalDetail = async (bankSoalId) => {
    const bs = state.masterBankSoal.find(x => x.id === bankSoalId);
    if(!bs) return;
    
    state.currentBankSoalId = bankSoalId;
    document.getElementById('headerEditorSoal').innerText = `Editor Soal: ${bs.kode} - ${bs.mapel}`;
    switchTab('viewEditorSoal', 'Editor Butir Soal');
    document.getElementById('panelFormSoal').classList.add('hidden');
    await loadDaftarButirSoal();
};

window.loadDaftarButirSoal = async () => {
    try {
        const snap = await getDocs(collection(db, `master_bank_soal/${state.currentBankSoalId}/butir_soal`));
        state.currentButirSoal = [];
        snap.forEach(d => state.currentButirSoal.push({ id: d.id, ...d.data() }));
        
        // Urutkan soal
        state.currentButirSoal.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        
        const container = document.getElementById('listButirSoal');
        container.innerHTML = '';
        
        state.currentButirSoal.forEach((soal, i) => {
            const isActive = state.activeSoalId === soal.id;
            container.innerHTML += `
                <button onclick="editButirSoal('${soal.id}', ${i+1})" 
                    class="w-10 h-10 flex items-center justify-center rounded border font-bold transition 
                    ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-blue-50'}">
                    ${i+1}
                </button>
            `;
        });
    } catch(e) { console.error(e); }
};

window.tambahButirSoalBaru = () => {
    state.activeSoalId = null;
    document.getElementById('panelFormSoal').classList.remove('hidden');
    document.getElementById('labelNomorSoal').innerText = `Soal Baru (No. ${state.currentButirSoal.length + 1})`;
    
    document.getElementById('editorTipeSoal').value = 'PG';
    document.getElementById('editorPertanyaan').value = '';
    ['A','B','C','D','E'].forEach(o => document.getElementById('opsi'+o).value = '');
    document.getElementById('editorKunci').value = '';
	// Tambahkan baris ini di akhir:
    if(typeof updatePreviewSoal === 'function') updatePreviewSoal();
};

window.editButirSoal = (id, noIndex) => {
    state.activeSoalId = id;
    const soal = state.currentButirSoal.find(x => x.id === id);
    if(!soal) return;
    
    document.getElementById('panelFormSoal').classList.remove('hidden');
    document.getElementById('labelNomorSoal').innerText = `Edit Soal No. ${noIndex}`;
    
    document.getElementById('editorTipeSoal').value = soal.tipe || 'PG';
    document.getElementById('editorPertanyaan').value = soal.pertanyaan || '';
    ['A','B','C','D','E'].forEach(o => {
        document.getElementById('opsi'+o).value = soal.opsi ? (soal.opsi[o] || '') : '';
    });
    document.getElementById('editorKunci').value = soal.kunci || '';
    
    window.loadDaftarButirSoal(); // Untuk highlight tombol nomor
	if(typeof updatePreviewSoal === 'function') updatePreviewSoal();
};

window.simpanButirSoal = async () => {
    const btn = document.getElementById('btnSimpanButir');
    btn.disabled = true; btn.innerText = "Menyimpan...";
    
    const data = {
        tipe: document.getElementById('editorTipeSoal').value,
        pertanyaan: document.getElementById('editorPertanyaan').value,
        opsi: {
            A: document.getElementById('opsiA').value,
            B: document.getElementById('opsiB').value,
            C: document.getElementById('opsiC').value,
            D: document.getElementById('opsiD').value,
            E: document.getElementById('opsiE').value
        },
        kunci: document.getElementById('editorKunci').value.toUpperCase(),
        noUrut: state.activeSoalId ? (state.currentButirSoal.find(x => x.id === state.activeSoalId).noUrut) : (state.currentButirSoal.length + 1)
    };

    try {
        const subCol = collection(db, `master_bank_soal/${state.currentBankSoalId}/butir_soal`);
        if(state.activeSoalId) {
            await updateDoc(doc(subCol, state.activeSoalId), data);
        } else {
            const newDoc = await addDoc(subCol, data);
            state.activeSoalId = newDoc.id;
        }
        alert("Butir soal disimpan!");
        await loadDaftarButirSoal();
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan soal.");
    } finally {
        btn.disabled = false; btn.innerText = "💾 Simpan Soal";
    }
};

window.hapusButirSoal = async () => {
    if(!state.activeSoalId) return;
    if(confirm("Hapus butir soal ini?")) {
        try {
            await deleteDoc(doc(db, `master_bank_soal/${state.currentBankSoalId}/butir_soal`, state.activeSoalId));
            state.activeSoalId = null;
            document.getElementById('panelFormSoal').classList.add('hidden');
            await loadDaftarButirSoal();
        } catch(e) { console.error(e); }
    }
};

// ==========================================
// JADWAL UJIAN / PENILAIAN
// ==========================================
window.loadJadwalUjian = async () => {
    try {
        // 1. Pastikan data referensi Dropdown tersedia
        if (state.masterSubjects.length === 0) {
            const s1 = await getDocs(collection(db, 'master_subjects'));
            state.masterSubjects = [];
            s1.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()}));
        }
        if (state.masterJenisUjian.length === 0) {
            const s2 = await getDocs(collection(db, 'master_jenis_ujian'));
            state.masterJenisUjian = [];
            s2.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()}));
        }
        if (state.masterBankSoal.length === 0) {
            const s3 = await getDocs(collection(db, 'master_bank_soal'));
            state.masterBankSoal = [];
            s3.forEach(d => state.masterBankSoal.push({id: d.id, ...d.data()}));
        }

        // 2. Isi Dropdown di Modal Jadwal
        const selMapel = document.getElementById('juMapel');
        selMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
        state.masterSubjects.forEach(m => selMapel.innerHTML += `<option value="${m.nama}">${m.nama}</option>`);

        const selJenis = document.getElementById('juJenis');
        selJenis.innerHTML = '<option value="">-- Pilih Jenis Penilaian --</option>';
        state.masterJenisUjian.forEach(j => selJenis.innerHTML += `<option value="${j.nama}">${j.nama}</option>`);

        // 3. Load Data Jadwal Utama
        const snap = await getDocs(collection(db, 'master_jadwal_ujian'));
        state.masterJadwalUjian = [];
        snap.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        
        window.renderTableJadwalUjian();
    } catch(e) {
        console.error("Error load jadwal ujian:", e);
    }
};

window.filterBankSoalByMapel = () => {
    const mapelTerpilih = document.getElementById('juMapel').value;
    const selBank = document.getElementById('juBankSoal');
    selBank.innerHTML = '<option value="">-- Pilih Bank Soal --</option>';
    
    if(!mapelTerpilih) return;

    // Hanya tampilkan Bank Soal yang Mapelnya sama dan statusnya Aktif
    const bankFiltered = state.masterBankSoal.filter(b => b.mapel === mapelTerpilih && b.isActive);
    
    if(bankFiltered.length === 0) {
        selBank.innerHTML = '<option value="">Belum ada Bank Soal Aktif untuk mapel ini</option>';
        return;
    }

    bankFiltered.forEach(b => {
        selBank.innerHTML += `<option value="${b.id}">${b.kode} - (Kls ${b.kelas}) - ${b.totalSoal} Soal</option>`;
    });
};

window.renderTableJadwalUjian = () => {
    const tb = document.getElementById('tableJadwalUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (state.masterJadwalUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Jadwal Ujian. Silakan klik + Tambah Jadwal.</td></tr>';
        return;
    }

    state.masterJadwalUjian.forEach((j, i) => {
        const bs = state.masterBankSoal.find(x => x.id === j.bankSoalId);
        const bsLabel = bs ? `${bs.kode} (Kls ${bs.kelas})` : '<span class="text-red-500 italic">Bank Soal Hilang</span>';
        
        // Logika Status Badge Sederhana
        let statusBadge = `<span class="bg-pink-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Belum dimulai</span>`;
        if(!j.isActive) {
            statusBadge = `<span class="bg-slate-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Tidak aktif</span>`;
        }

        const tglMulai = j.tglMulai ? new Date(j.tglMulai).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '-';

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-l-4 ${j.isActive ? 'border-l-blue-500' : 'border-l-slate-400'} border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r">
                    <p class="font-bold text-slate-800">${j.mapel || '-'}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">${j.jenis || '-'}</p>
                </td>
                <td class="p-3 border-r font-mono text-sm text-blue-700 font-bold">${bsLabel}</td>
                <td class="p-3 border-r text-center text-[11px] whitespace-nowrap font-bold text-slate-600">${tglMulai}</td>
                <td class="p-3 border-r text-center font-black text-slate-700">${j.durasi || 0} <span class="text-[10px] font-normal">Mnt</span></td>
                <td class="p-3 border-r text-center">${statusBadge}</td>
                <td class="p-3 text-center space-x-1 whitespace-nowrap">
                    <button onclick="editJadwalUjian('${j.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-2 py-1 rounded shadow-sm text-xs font-bold transition">✏️</button>
                    <button onclick="hapusJadwalUjian('${j.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalJadwalUjian = () => {
    document.getElementById('jadwalUjianId').value = '';
    document.getElementById('juMapel').value = '';
    document.getElementById('juBankSoal').innerHTML = '<option value="">-- Pilih Bank Soal --</option>';
    
    // Set Waktu Default (Sekarang s/d Besok)
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const localTom = (new Date(tomorrow - tzOffset)).toISOString().slice(0, 16);

    document.getElementById('juTglMulai').value = localNow;
    document.getElementById('juTglExpired').value = localTom;
    document.getElementById('juDurasi').value = '90';
    document.getElementById('juDurasiMin').value = '30';
    
    // Default Checkboxes
    document.getElementById('juAcakSoal').checked = true;
    document.getElementById('juAcakJawaban').checked = true;
    document.getElementById('juGunakanToken').checked = false;
    document.getElementById('juTampilkanHasil').checked = false;
    document.getElementById('juResetIzin').checked = false;
    document.getElementById('juAktif').checked = true;

    document.getElementById('modalJadwalUjian').classList.remove('hidden');
};

window.simpanJadwalUjian = async () => {
    const id = document.getElementById('jadwalUjianId').value;
    const mapel = document.getElementById('juMapel').value;
    const bankSoalId = document.getElementById('juBankSoal').value;
    const jenis = document.getElementById('juJenis').value;
    const tglMulai = document.getElementById('juTglMulai').value;
    const tglExpired = document.getElementById('juTglExpired').value;

    if(!mapel || !bankSoalId || !tglMulai || !tglExpired) {
        return alert("Mata Pelajaran, Bank Soal, dan Rentang Waktu wajib diisi!");
    }

    const data = {
        mapel, bankSoalId, jenis, tglMulai, tglExpired,
        durasi: parseInt(document.getElementById('juDurasi').value) || 90,
        durasiMin: parseInt(document.getElementById('juDurasiMin').value) || 30,
        acakSoal: document.getElementById('juAcakSoal').checked,
        acakJawaban: document.getElementById('juAcakJawaban').checked,
        gunakanToken: document.getElementById('juGunakanToken').checked,
        tampilkanHasil: document.getElementById('juTampilkanHasil').checked,
        resetIzin: document.getElementById('juResetIzin').checked,
        isActive: document.getElementById('juAktif').checked
    };

    const btn = document.getElementById('btnSimpanJadwal');
    if(btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }

    try {
        if(id) await updateDoc(doc(db, 'master_jadwal_ujian', id), data);
        else await addDoc(collection(db, 'master_jadwal_ujian'), data);
        
        closeModal('modalJadwalUjian');
        alert("Jadwal Ujian berhasil diterbitkan!");
        loadJadwalUjian();
    } catch(e) {
        console.error("Gagal simpan jadwal:", e);
        alert("Gagal menyimpan jadwal.");
    } finally {
        if(btn) { btn.disabled = false; btn.innerText = "✔️ Simpan"; }
    }
};

window.editJadwalUjian = (id) => {
    const j = state.masterJadwalUjian.find(x => x.id === id);
    if(!j) return;

    document.getElementById('jadwalUjianId').value = j.id;
    document.getElementById('juMapel').value = j.mapel || '';
    
    // Filter bank soal dulu agar dropdown bank soal terisi, baru set value-nya
    window.filterBankSoalByMapel();
    
    setTimeout(() => {
        document.getElementById('juBankSoal').value = j.bankSoalId || '';
    }, 100);

    document.getElementById('juJenis').value = j.jenis || '';
    document.getElementById('juTglMulai').value = j.tglMulai || '';
    document.getElementById('juTglExpired').value = j.tglExpired || '';
    document.getElementById('juDurasi').value = j.durasi || '90';
    document.getElementById('juDurasiMin').value = j.durasiMin || '30';
    
    document.getElementById('juAcakSoal').checked = j.acakSoal !== false;
    document.getElementById('juAcakJawaban').checked = j.acakJawaban !== false;
    document.getElementById('juGunakanToken').checked = j.gunakanToken === true;
    document.getElementById('juTampilkanHasil').checked = j.tampilkanHasil === true;
    document.getElementById('juResetIzin').checked = j.resetIzin === true;
    document.getElementById('juAktif').checked = j.isActive !== false;

    document.getElementById('modalJadwalUjian').classList.remove('hidden');
};

window.hapusJadwalUjian = async (id) => {
    if(confirm("Yakin ingin menghapus jadwal ini? Siswa tidak akan bisa lagi mengerjakan ujian melalui jadwal ini.")) {
        try {
            await deleteDoc(doc(db, 'master_jadwal_ujian', id));
            loadJadwalUjian();
        } catch(e) { console.error(e); }
    }
};

// ==========================================
// PENGATURAN ALOKASI WAKTU UJIAN
// ==========================================
window.loadAlokasiWaktu = async () => {
    try {
        // 1. Pastikan data Jadwal, Bank Soal, dan Jenis Ujian sudah dimuat
        if (state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({ id: d.id, ...d.data() }));
        }
        if (state.masterBankSoal.length === 0) {
            const snapBank = await getDocs(collection(db, 'master_bank_soal'));
            state.masterBankSoal = [];
            snapBank.forEach(d => state.masterBankSoal.push({ id: d.id, ...d.data() }));
        }
        if (state.masterJenisUjian.length === 0) {
            const snapJenis = await getDocs(collection(db, 'master_jenis_ujian'));
            state.masterJenisUjian = [];
            snapJenis.forEach(d => state.masterJenisUjian.push({ id: d.id, ...d.data() }));
        }

        // 2. Isi Dropdown Jenis Penilaian
        const filterJenis = document.getElementById('filterAlokasiJenis');
        if (filterJenis) {
            filterJenis.innerHTML = '<option value="">Semua Jenis</option>';
            state.masterJenisUjian.forEach(j => {
                filterJenis.innerHTML += `<option value="${j.nama}">${j.nama}</option>`;
            });
        }

        window.renderTableAlokasiWaktu();
    } catch (e) {
        console.error("Error load alokasi waktu:", e);
    }
};

window.renderTableAlokasiWaktu = () => {
    const tb = document.getElementById('tableAlokasiWaktuBody');
    if (!tb) return;
    tb.innerHTML = '';

    const filterJenisVal = document.getElementById('filterAlokasiJenis').value;
    
    // Hanya tampilkan Jadwal yang statusnya Aktif
    let jadwalAktif = state.masterJadwalUjian.filter(j => j.isActive);

    if (filterJenisVal) {
        jadwalAktif = jadwalAktif.filter(j => j.jenis === filterJenisVal);
    }

    if (jadwalAktif.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Jadwal Ujian yang Aktif. Aktifkan jadwal terlebih dahulu di menu JADWAL.</td></tr>';
        return;
    }

    // Urutkan berdasarkan tanggal mulai
    jadwalAktif.sort((a, b) => new Date(a.tglMulai) - new Date(b.tglMulai));

    jadwalAktif.forEach((j, i) => {
        const bs = state.masterBankSoal.find(x => x.id === j.bankSoalId);
        const kodeBS = bs ? bs.kode : '-';
        const kelasBS = bs ? bs.kelas : '-';
        const jamKe = j.jamKe || 1; // Default ke jam 1 jika belum diatur

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100" data-jadwal-id="${j.id}">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i + 1}</td>
                <td class="p-3 border-r font-mono text-sm font-bold text-blue-700">${kodeBS}</td>
                <td class="p-3 border-r">
                    <p class="font-bold text-slate-800">${j.mapel}</p>
                    <p class="text-[10px] text-slate-500 uppercase font-bold">${j.jenis || 'Ujian'}</p>
                </td>
                <td class="p-3 border-r text-center font-bold text-slate-600">Kelas ${kelasBS}</td>
                <td class="p-3 text-center bg-blue-50/30">
                    <input type="number" 
                        class="w-20 p-2 border border-slate-300 rounded text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-black text-blue-700 input-jamke" 
                        value="${jamKe}" min="0" max="10">
                </td>
            </tr>
        `;
    });
};

window.simpanAlokasiWaktu = async () => {
    const btn = document.getElementById('btnSimpanAlokasi');
    if (btn) { btn.disabled = true; btn.innerHTML = `Menyimpan...`; }

    const tb = document.getElementById('tableAlokasiWaktuBody');
    const rows = tb.querySelectorAll('tr[data-jadwal-id]');
    
    try {
        const promises = [];
        rows.forEach(row => {
            const idJadwal = row.getAttribute('data-jadwal-id');
            const jamKeVal = parseInt(row.querySelector('.input-jamke').value) || 0;
            
            // Update state lokal agar tampilan tidak reset saat render ulang
            const jLocal = state.masterJadwalUjian.find(x => x.id === idJadwal);
            if (jLocal) jLocal.jamKe = jamKeVal;
            
            // Simpan perubahan ke Firestore pada koleksi master_jadwal_ujian
            promises.push(updateDoc(doc(db, 'master_jadwal_ujian', idJadwal), { jamKe: jamKeVal }));
        });

        await Promise.all(promises);
        alert("Alokasi urutan waktu ujian berhasil disimpan!");
    } catch (e) {
        console.error("Gagal simpan alokasi waktu:", e);
        alert("Terjadi kesalahan saat menyimpan data.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `💾 Simpan Alokasi`; }
    }
};

// ==========================================
// MONITORING STATUS UJIAN SISWA
// ==========================================
window.loadStatusSiswa = async () => {
    try {
        // 1. Pastikan data referensi (Jadwal, Ruang, Sesi) tersedia
        if (state.masterJadwalUjian.length === 0) {
            const s1 = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            s1.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }
        if (state.masterRuangUjian.length === 0) {
            const s2 = await getDocs(collection(db, 'master_ruang_ujian'));
            state.masterRuangUjian = [];
            s2.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));
            state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }
        if (state.masterSesiUjian.length === 0) {
            const s3 = await getDocs(collection(db, 'master_sesi_ujian'));
            state.masterSesiUjian = [];
            s3.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));
            state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }
        
        // 2. Load Data Siswa Terbaru
        const s4 = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        s4.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        // 3. Ambil Token Aktif untuk ditampilkan di header
        const snapToken = await getDoc(doc(db, 'settings', 'token_ujian'));
        if (snapToken.exists()) {
            document.getElementById('displayTokenStatusSiswa').innerText = snapToken.data().currentToken || '------';
        }

        // 4. Render Dropdown Filter
        const selJadwal = document.getElementById('filterStatusJadwal');
        selJadwal.innerHTML = '<option value="">-- Pilih Jadwal Aktif --</option>';
        state.masterJadwalUjian.filter(j => j.isActive).forEach(j => {
            selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} (${j.jenis})</option>`;
        });

        const selRuang = document.getElementById('filterStatusRuang');
        selRuang.innerHTML = '<option value="">Semua Ruang</option>';
        state.masterRuangUjian.forEach(r => {
            selRuang.innerHTML += `<option value="${r.nama}">${r.nama}</option>`;
        });

        const selSesi = document.getElementById('filterStatusSesi');
        selSesi.innerHTML = '<option value="">Semua Sesi</option>';
        state.masterSesiUjian.forEach(s => {
            selSesi.innerHTML += `<option value="${s.nama}">${s.nama}</option>`;
        });

        window.renderTableStatusSiswa();
    } catch (e) {
        console.error("Error load status siswa:", e);
    }
};

window.renderTableStatusSiswa = () => {
    const ruangVal = document.getElementById('filterStatusRuang').value;
    const sesiVal = document.getElementById('filterStatusSesi').value;
    const tb = document.getElementById('tableStatusSiswaBody');
    if (!tb) return;
    tb.innerHTML = '';

    // Filter siswa berdasarkan Ruang dan Sesi yang dipilih
    let filteredSiswa = [...state.masterSiswa];
    if (ruangVal) filteredSiswa = filteredSiswa.filter(s => s.ruang === ruangVal);
    if (sesiVal) filteredSiswa = filteredSiswa.filter(s => s.sesi === sesiVal);

    // Urutkan berdasarkan nama
    filteredSiswa.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

    if (filteredSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic bg-slate-50">Tidak ada siswa yang terdaftar di ruang/sesi tersebut.</td></tr>';
        return;
    }

    filteredSiswa.forEach((s, i) => {
        // Logika Status: Jika 'isOnline' true di database (diset saat siswa mulai ujian)
        const isOnline = s.isOnline === true;
        const statusBadge = isOnline 
            ? `<span class="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-bold shadow-sm animate-pulse">Sedang Mengerjakan</span>` 
            : `<span class="bg-slate-300 text-slate-700 px-3 py-1 rounded-full text-[10px] font-bold shadow-sm">Offline / Belum Mulai</span>`;

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i + 1}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-blue-700 tracking-tighter">${s.nis || s.nisn || '-'}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase text-sm">${s.nama || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">Kelas ${s.kelas || '-'}</td>
                <td class="p-3 border-r text-center">${statusBadge}</td>
                <td class="p-3 text-center">
                    <button onclick="resetLoginSiswa('${s.id}', '${s.nama}')" 
                        class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded shadow-sm text-[10px] font-black transition w-full uppercase">
                        Reset Login
                    </button>
                </td>
            </tr>
        `;
    });
};

window.resetLoginSiswa = async (id, nama) => {
    if (confirm(`Yakin ingin me-reset status login untuk ${nama}? Siswa akan bisa melakukan login kembali dari perangkat mana pun.`)) {
        try {
            // Update status di database agar siswa bisa login ulang
            await updateDoc(doc(db, 'master_siswa', id), { 
                isOnline: false,
                currentExamSession: null 
            });
            alert(`Berhasil! Sesi login ${nama} telah dibersihkan.`);
            window.loadStatusSiswa(); // Refresh tampilan
        } catch (e) {
            console.error("Gagal reset login:", e);
            alert("Gagal menghubungi server.");
        }
    }
};

// ==========================================
// HASIL UJIAN SISWA
// ==========================================
window.loadHasilUjian = async () => {
    try {
        // 1. Pastikan data Kelas tersedia untuk filter dropdown
        if (state.masterKelas.length === 0) {
            const s1 = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            s1.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        // 2. Pastikan data Jadwal tersedia untuk filter dropdown
        if (state.masterJadwalUjian.length === 0) {
            const s2 = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            s2.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }

        // 3. Load Data Hasil Ujian dari collection exam_results
        const s3 = await getDocs(collection(db, 'exam_results'));
        state.allResults = [];
        s3.forEach(d => state.allResults.push({id: d.id, ...d.data()}));

        // 4. Render Opsi Filter Kelas
        const selKelas = document.getElementById('filterHasilKelas');
        selKelas.innerHTML = '<option value="">Pilih Kelas</option>';
        state.masterKelas.forEach(k => {
            selKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`;
        });

        // 5. Render Opsi Filter Jadwal
        const selJadwal = document.getElementById('filterHasilJadwal');
        selJadwal.innerHTML = '<option value="">Pilih Jadwal</option>';
        state.masterJadwalUjian.forEach(j => {
            selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} - ${j.jenis}</option>`;
        });

        window.renderTableHasilUjian();
    } catch(e) {
        console.error("Error load hasil ujian:", e);
    }
};

window.renderTableHasilUjian = () => {
    const kelasVal = document.getElementById('filterHasilKelas').value;
    const jadwalVal = document.getElementById('filterHasilJadwal').value;
    const tb = document.getElementById('tableHasilUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!kelasVal || !jadwalVal) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 bg-slate-50 italic">Silakan pilih Kelas dan Jadwal terlebih dahulu untuk menampilkan data nilai.</td></tr>';
        return;
    }

    // Filter data berdasarkan pilihan dropdown
    let filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);

    if (filteredResults.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada data nilai yang masuk untuk kelas dan jadwal ini.</td></tr>';
        return;
    }

    // Urutkan berdasarkan nama siswa
    filteredResults.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

    filteredResults.forEach((r, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded accent-blue-600"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800 text-sm">${r.nama || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600 text-xs">${r.kelas || '-'}</td>
                <td class="p-3 border-r text-center text-green-600 font-bold">${r.benar || 0}</td>
                <td class="p-3 border-r text-center text-red-600 font-bold">${r.salah || 0}</td>
                <td class="p-3 border-r text-center font-black text-blue-700 text-lg">${r.skor || 0}</td>
                <td class="p-3 text-center">
                    <button onclick="lihatDetailNilai('${r.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded shadow-sm text-[10px] font-bold transition w-full uppercase">
                        🔍 Detail
                    </button>
                </td>
            </tr>
        `;
    });
};

window.lihatDetailNilai = (resultId) => {
    const res = state.allResults.find(x => x.id === resultId);
    if (!res) return;
    
    const modal = document.getElementById('modalDetailNilai');
    const container = modal.querySelector('.bg-white'); // Ambil kotak putih dalam modal
    
    // Generate tabel detail jawaban HTML
    let detailHtml = '<div class="max-h-60 overflow-y-auto mb-4 border border-slate-200 rounded p-0 text-sm">';
    if (res.detailJawaban && Object.keys(res.detailJawaban).length > 0) {
        detailHtml += '<table class="w-full text-left border-collapse"><thead class="bg-slate-100"><tr><th class="p-2 border-b text-center">No</th><th class="p-2 border-b text-center">Jawaban Siswa</th><th class="p-2 border-b text-center">Status</th></tr></thead><tbody>';
        for (const [no, ans] of Object.entries(res.detailJawaban)) {
            const status = ans.isCorrect ? '✅ Benar' : '❌ Salah';
            const color = ans.isCorrect ? 'text-green-600' : 'text-red-600';
            const bgClass = ans.isCorrect ? 'bg-white' : 'bg-red-50';
            detailHtml += `<tr class="${bgClass}"><td class="p-2 border-b text-center">${no}</td><td class="p-2 border-b text-center font-bold">${ans.answer || '-'}</td><td class="p-2 border-b text-center ${color} font-bold">${status}</td></tr>`;
        }
        detailHtml += '</tbody></table>';
    } else {
        detailHtml += '<p class="text-center text-slate-500 italic p-4">Siswa belum memiliki rincian jawaban di database.</p>';
    }
    detailHtml += '</div>';

    // Suntikkan desain ke dalam modal
    container.innerHTML = `
        <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 class="font-bold text-lg text-slate-800">Detail Ujian: <span class="text-blue-600 uppercase">${res.nama}</span></h3>
            <button onclick="closeModal('modalDetailNilai')" class="text-slate-400 hover:text-red-500 font-bold text-xl">✖</button>
        </div>
        <div class="grid grid-cols-3 gap-3 mb-4 text-center">
            <div class="bg-blue-50 border border-blue-200 p-2 rounded"><p class="text-[10px] uppercase font-bold text-blue-600">Skor Akhir</p><h4 class="text-2xl font-black text-blue-700">${res.skor || 0}</h4></div>
            <div class="bg-green-50 border border-green-200 p-2 rounded"><p class="text-[10px] uppercase font-bold text-green-600">Jml Benar</p><h4 class="text-2xl font-black text-green-700">${res.benar || 0}</h4></div>
            <div class="bg-red-50 border border-red-200 p-2 rounded"><p class="text-[10px] uppercase font-bold text-red-600">Jml Salah</p><h4 class="text-2xl font-black text-red-700">${res.salah || 0}</h4></div>
        </div>
        <p class="font-bold text-sm text-slate-700 mb-2">Rincian Jawaban:</p>
        ${detailHtml}
        <div class="flex justify-end mt-4">
            <button onclick="closeModal('modalDetailNilai')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-6 py-2 rounded-lg font-bold shadow-sm transition">Tutup</button>
        </div>
    `;
    
    // Tampilkan modal
    modal.classList.remove('hidden');
};

window.eksporHasilExcel = () => {
    const kelasVal = document.getElementById('filterHasilKelas').value;
    const jadwalVal = document.getElementById('filterHasilJadwal').value;
    
    if (!kelasVal || !jadwalVal) {
        return alert("Harap filter Kelas dan Jadwal terlebih dahulu sebelum mengekspor data ke Excel.");
    }

    const filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);
    if (filteredResults.length === 0) return alert("Tidak ada data nilai untuk diekspor pada filter ini.");

    // Format data agar cantik saat masuk ke Excel
    const dataToExport = filteredResults.map((r, index) => ({
        "No": index + 1,
        "NIS/NISN": r.nis || r.nisn || "-",
        "Nama Peserta": r.nama,
        "Kelas": r.kelas,
        "Jumlah Benar": r.benar || 0,
        "Jumlah Salah": r.salah || 0,
        "NILAI AKHIR": r.skor || 0
    }));

    // Membuat WorkBook Excel (menggunakan library XLSX SheetJS)
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");

    // Unduh File
    const fileName = `Rekap_Nilai_${kelasVal}_Jadwal_${jadwalVal}.xlsx`;
    XLSX.writeFile(workbook, fileName);
};

// ==========================================
// ANALISA BUTIR SOAL
// ==========================================
window.loadAnalisaSoal = async () => {
    try {
        // 1. Load Jadwal jika data belum tersedia di state
        if (state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({ id: d.id, ...d.data() }));
        }

        // 2. Load Konfigurasi Akademik (Tahun & Semester)
        const snapConfig = await getDoc(doc(db, 'settings', 'academic_config'));
        if (snapConfig.exists()) {
            state.academicConfig = snapConfig.data();
        }

        // 3. Render Dropdown Tahun Pelajaran
        const selTahun = document.getElementById('filterAnalisaTahun');
        if (selTahun) {
            selTahun.innerHTML = '';
            if (state.academicConfig && state.academicConfig.years) {
                state.academicConfig.years.forEach(y => {
                    const selected = y.isActive ? 'selected' : '';
                    selTahun.innerHTML += `<option value="${y.name}" ${selected}>${y.name}</option>`;
                });
            } else {
                selTahun.innerHTML = '<option value="2025/2026">2025/2026</option>';
            }
        }

        // 4. Render Dropdown Semester Aktif
        const selSmt = document.getElementById('filterAnalisaSmt');
        if (selSmt && state.academicConfig && state.academicConfig.activeSemester) {
            selSmt.value = state.academicConfig.activeSemester;
        }

        // 5. Render Dropdown Jadwal (Hanya menampilkan jadwal yang aktif)
        const selJadwal = document.getElementById('filterAnalisaJadwal');
        if (selJadwal) {
            selJadwal.innerHTML = '<option value="">-- Pilih Jadwal Ujian --</option>';
            state.masterJadwalUjian.filter(j => j.isActive).forEach(j => {
                selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} - ${j.jenis}</option>`;
            });
        }

        // Reset tampilan container hasil
        document.getElementById('containerHasilAnalisa').innerHTML = 
            '<div class="p-8 text-center text-slate-500 italic bg-slate-50 rounded border border-slate-100">Silakan pilih Jadwal Ujian untuk menampilkan hasil analisa butir soal.</div>';
    } catch (e) {
        console.error("Error load analisa soal:", e);
    }
};

window.renderAnalisaSoal = async () => {
    const jadwalId = document.getElementById('filterAnalisaJadwal').value;
    const container = document.getElementById('containerHasilAnalisa');

    if (!jadwalId) {
        container.innerHTML = '<div class="p-8 text-center text-slate-500 italic bg-slate-50 rounded border border-slate-100">Silakan pilih Jadwal Ujian untuk menampilkan hasil analisa butir soal.</div>';
        return;
    }

    // Indikator loading
    container.innerHTML = '<div class="p-12 text-center"><p class="text-blue-600 font-bold animate-pulse">Memproses algoritma statistik butir soal...</p></div>';

    try {
        // 1. Tarik data pengerjaan siswa dari Firebase berdasarkan Jadwal ID
        const snapResults = await getDocs(collection(db, 'exam_results'));
        let results = [];
        snapResults.forEach(d => {
            const data = d.data();
            if (data.jadwalId === jadwalId) results.push(data);
        });

        if (results.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-red-500 italic bg-slate-50 rounded border border-slate-100">Belum ada siswa yang menyelesaikan ujian pada jadwal ini. Analisa tidak dapat dilakukan.</div>';
            return;
        }

        // 2. Ambil referensi jumlah soal (mengambil dari struktur detailJawaban siswa pertama)
        const sampleAnswers = results[0].detailJawaban || {};
        const totalSoal = Object.keys(sampleAnswers).length;

        if (totalSoal === 0) {
             container.innerHTML = '<div class="p-8 text-center text-red-500 italic bg-slate-50 rounded border border-slate-100">Format data jawaban tidak valid. Analisa gagal. Pastikan saat siswa selesai ujian, data "detailJawaban" tersimpan di database.</div>';
             return;
        }

        // 3. Klasifikasi Kelompok Atas (27%) dan Bawah (27%)
        // Urutkan siswa dari nilai tertinggi ke terendah
        results.sort((a, b) => (b.skor || 0) - (a.skor || 0));
        
        // Hitung batas 27% dari total peserta (minimal 1 siswa jika pesertanya sedikit)
        const nKlp = Math.max(1, Math.round(results.length * 0.27));
        const klpAtas = results.slice(0, nKlp);
        const klpBawah = results.slice(-nKlp);

        let tableRows = '';

        // 4. Hitung Statistik Tingkat Kesukaran (TK) & Daya Pembeda (DP) per soal
        for (let i = 1; i <= totalSoal; i++) {
            const indexSoal = i.toString();
            
            // Total siswa yang menjawab benar di seluruh kelas
            const benarTotal = results.filter(r => r.detailJawaban && r.detailJawaban[indexSoal] && r.detailJawaban[indexSoal].isCorrect).length;
            // Total kelompok atas yang menjawab benar
            const benarAtas = klpAtas.filter(r => r.detailJawaban && r.detailJawaban[indexSoal] && r.detailJawaban[indexSoal].isCorrect).length;
            // Total kelompok bawah yang menjawab benar
            const benarBawah = klpBawah.filter(r => r.detailJawaban && r.detailJawaban[indexSoal] && r.detailJawaban[indexSoal].isCorrect).length;

            // Rumus Tingkat Kesukaran (TK) = Benar Total / Jumlah Siswa Total
            const tkValue = benarTotal / results.length;
            let tkLabel = tkValue > 0.70 ? "Mudah" : (tkValue >= 0.30 ? "Sedang" : "Sukar");

            // Rumus Daya Pembeda (DP) = (Benar Atas / N Kelompok) - (Benar Bawah / N Kelompok)
            const dpValue = (benarAtas / nKlp) - (benarBawah / nKlp);
            let dpLabel = "";
            if (dpValue >= 0.40) dpLabel = "Sangat Baik";
            else if (dpValue >= 0.30) dpLabel = "Baik";
            else if (dpValue >= 0.20) dpLabel = "Cukup";
            else dpLabel = "Buruk";
            
            // Penentuan Status Validitas
            let statusLabel = "";
            if (dpValue >= 0.20) {
                statusLabel = '<span class="bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">Diterima</span>';
            } else if (dpValue >= 0.10) {
                statusLabel = '<span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">Revisi</span>';
            } else {
                statusLabel = '<span class="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase shadow-sm">Ditolak / Dibuang</span>';
            }

            tableRows += `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                    <td class="p-3 text-center border-r font-bold text-slate-700">${i}</td>
                    <td class="p-3 text-center border-r font-mono text-sm">${tkValue.toFixed(2)} <span class="text-xs text-slate-500">(${tkLabel})</span></td>
                    <td class="p-3 text-center border-r font-mono text-sm">${dpValue.toFixed(2)} <span class="text-xs text-slate-500">(${dpLabel})</span></td>
                    <td class="p-3 text-center">${statusLabel}</td>
                </tr>`;
        }

        // Render tabel akhir
        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h4 class="font-bold text-slate-800">Laporan Analisa Butir Soal (N = ${results.length} Peserta)</h4>
                <div class="text-xs text-slate-500 text-right">
                    Kelompok Atas/Bawah: <b>${nKlp} Siswa (27%)</b>
                </div>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse border border-slate-200">
                    <thead class="bg-slate-50 text-slate-700 text-sm border-b">
                        <tr>
                            <th class="p-3 text-center border-r w-20">No Soal</th>
                            <th class="p-3 text-center border-r">Tingkat Kesukaran (TK)</th>
                            <th class="p-3 text-center border-r">Daya Pembeda (DP)</th>
                            <th class="p-3 text-center w-36">Status Soal</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 text-sm bg-white">${tableRows}</tbody>
                </table>
            </div>
            <div class="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                <b>Keterangan Algoritma:</b> Perhitungan menggunakan batas populasi 27%. Soal <b>Diterima</b> jika nilai DP ≥ 0.20. Jika DP bernilai negatif, berarti kelompok bawah lebih banyak menjawab benar daripada kelompok atas (soal menjebak).
            </div>`;
            
    } catch (e) {
        console.error("Gagal merender analisa:", e);
        container.innerHTML = '<div class="p-8 text-center text-red-600 bg-red-50 rounded border border-red-200">Terjadi kesalahan saat memproses perhitungan. Pastikan koneksi internet stabil.</div>';
    }
};

// ==========================================
// REKAP HASIL PENILAIAN
// ==========================================
window.loadRekapNilai = async () => {
    try {
        // 1. Pastikan data pendukung (Konfigurasi Akademik, Jadwal, Siswa, Hasil) tersedia
        const snapConfig = await getDoc(doc(db, 'settings', 'academic_config'));
        if(snapConfig.exists()) {
            state.academicConfig = snapConfig.data();
        }

        if(state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }

        if(state.masterSiswa.length === 0) {
            const snapSiswa = await getDocs(collection(db, 'master_siswa'));
            state.masterSiswa = [];
            snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));
        }

        if(state.masterBankSoal.length === 0) {
            const snapBank = await getDocs(collection(db, 'master_bank_soal'));
            state.masterBankSoal = [];
            snapBank.forEach(d => state.masterBankSoal.push({id: d.id, ...d.data()}));
        }

        const snapResults = await getDocs(collection(db, 'exam_results'));
        state.allResults = [];
        snapResults.forEach(d => state.allResults.push({id: d.id, ...d.data()}));

        window.renderRekapNilai();
    } catch(e) {
        console.error("Error load rekap nilai:", e);
    }
};

window.renderRekapNilai = () => {
    const container = document.getElementById('containerRekapNilai');
    if (!container) return;

    let activeYear = "2025/2026";
    let activeSmt = "Ganjil";

    if(state.academicConfig) {
        if(state.academicConfig.years) {
            const y = state.academicConfig.years.find(x => x.isActive);
            if(y) activeYear = y.name;
        }
        if(state.academicConfig.activeSemester) {
            activeSmt = state.academicConfig.activeSemester;
        }
    }

    if(!state.masterJadwalUjian || state.masterJadwalUjian.length === 0) {
        container.innerHTML = `<div class="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded shadow-sm text-sm">Belum ada jadwal penilaian untuk Tahun Pelajaran <b>${activeYear}</b> Semester: <b>${activeSmt}</b></div>`;
        return;
    }

    let tableRows = '';
    state.masterJadwalUjian.forEach((j, i) => {
        // Cari Bank Soal untuk mengetahui target kelas
        const bs = state.masterBankSoal.find(x => x.id === j.bankSoalId);
        const targetKelas = bs ? bs.kelas : null;

        // Hitung Total Peserta (Siswa di kelas tersebut)
        const totalPeserta = targetKelas 
            ? state.masterSiswa.filter(s => s.kelas === targetKelas).length 
            : 0;

        // Hitung Siswa yang sudah mengerjakan (Data ada di exam_results)
        const sudahMengerjakan = state.allResults.filter(r => r.jadwalId === j.id).length;
        
        const persen = totalPeserta > 0 ? Math.round((sudahMengerjakan / totalPeserta) * 100) : 0;
        const colorClass = persen === 100 ? 'text-green-600' : 'text-blue-600';

        tableRows += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-4 text-center border-r font-bold text-slate-500">${i + 1}</td>
                <td class="p-4 border-r">
                    <p class="font-bold text-slate-800">${j.mapel}</p>
                    <p class="text-[10px] text-slate-500 font-bold uppercase">${j.jenis} | KELAS ${targetKelas || '-'}</p>
                </td>
                <td class="p-4 border-r text-center font-bold text-slate-700">${totalPeserta} Siswa</td>
                <td class="p-4 border-r text-center">
                    <span class="font-black ${colorClass}">${sudahMengerjakan}</span>
                    <span class="text-xs text-slate-400"> / ${totalPeserta} (${persen}%)</span>
                </td>
                <td class="p-4 text-center">
                    <button onclick="switchTab('viewHasilUjian', 'Hasil Ujian'); document.getElementById('filterHasilJadwal').value='${j.id}'; renderTableHasilUjian();" 
                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded shadow-sm text-xs font-bold transition uppercase">
                        Lihat Nilai
                    </button>
                </td>
            </tr>
        `;
    });

    container.innerHTML = `
        <div class="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded shadow-sm text-sm mb-6 flex justify-between items-center">
            <div>Menampilkan rekapitulasi penilaian untuk Tahun Pelajaran <b>${activeYear}</b> | Semester: <b>${activeSmt}</b></div>
            <button onclick="loadRekapNilai()" class="bg-white border border-blue-300 text-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-50 transition">🔄 Segarkan Data</button>
        </div>
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse border border-slate-200">
                <thead class="bg-blue-600 text-white text-sm">
                    <tr>
                        <th class="p-4 text-center w-16 border border-blue-500 font-medium">No.</th>
                        <th class="p-4 border border-blue-500 font-medium">Jadwal Penilaian</th>
                        <th class="p-4 border border-blue-500 text-center font-medium">Target Peserta</th>
                        <th class="p-4 border border-blue-500 text-center font-medium">Selesai Mengerjakan</th>
                        <th class="p-4 border border-blue-500 text-center font-medium">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 text-sm bg-white">
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
};

// ==========================================
// PENGATURAN DATA CETAK BERKAS
// ==========================================
window.loadCetak = async () => {
    try {
        // 1. Pastikan data profil sekolah termuat untuk Kop Surat
        const snapProfil = await getDoc(doc(db, 'settings', 'profil_sekolah'));
        if(snapProfil.exists()) state.schoolProfile = snapProfil.data();

        // 2. Load data Siswa untuk Kartu dan Daftar Hadir
        if(state.masterSiswa.length === 0) {
            const snapSiswa = await getDocs(collection(db, 'master_siswa'));
            state.masterSiswa = [];
            snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));
        }

        // 3. Load data Jadwal untuk Berita Acara
        if(state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }
        
        console.log("Data Cetak Berhasil Disiapkan.");
    } catch(e) {
        console.error("Gagal menyiapkan data cetak:", e);
    }
};

// --- FUNGSI HELPER UNTUK KOP SURAT ---
const generateKopHTML = () => {
    const p = state.schoolProfile || {};
    const kab = (p.kabupaten || 'SAMPANG').toUpperCase();
    const logoKiri = p.logoKiri ? `<img src="${p.logoKiri}" style="max-height:80px;">` : '';
    const logoKanan = p.logoKanan ? `<img src="${p.logoKanan}" style="max-height:80px;">` : '';
    
    return `
        <table style="width: 100%; border-bottom: 3px solid black; margin-bottom: 2px;">
            <tr>
                <td width="15%" align="center">${logoKiri}</td>
                <td width="70%" align="center">
                    <div style="font-size: 14pt; font-weight: bold;">PEMERINTAH KABUPATEN ${kab}</div>
                    <div style="font-size: 14pt; font-weight: bold;">DINAS PENDIDIKAN</div>
                    <div style="font-size: 16pt; font-weight: 900; text-transform: uppercase;">${p.sekolah || 'UPTD SDN MARGANTOKO 2'}</div>
                    <div style="font-size: 10pt;">${p.alamat || ''} Kec. ${p.kecamatan || ''} Kode Pos ${p.kodePos || ''}</div>
                    <div style="font-size: 9pt;">Email: ${p.email || '-'} | Website: ${p.website || '-'}</div>
                </td>
                <td width="15%" align="center">${logoKanan}</td>
            </tr>
        </table>
        <hr style="border: 1px solid black; margin-top: 2px; margin-bottom: 20px;">
    `;
};

// --- 1. CETAK KARTU PESERTA ---
window.cetakKartuPeserta = () => {
    if(state.masterSiswa.length === 0) return alert("Data siswa kosong!");
    
    const printWindow = window.open('', '_blank');
    let kartuHtml = '';
    
    state.masterSiswa.forEach((s, i) => {
        kartuHtml += `
            <div style="width: 45%; border: 2px solid black; padding: 10px; margin: 5px; display: inline-block; vertical-align: top; font-family: Arial;">
                <div style="text-align: center; font-weight: bold; font-size: 10pt; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">
                    KARTU PESERTA UJIAN<br>${(state.schoolProfile.aplikasi || 'CBT GARAM').toUpperCase()}
                </div>
                <table style="font-size: 9pt; width: 100%;">
                    <tr><td width="30%">Nama</td><td>: ${s.nama}</td></tr>
                    <tr><td>No Peserta</td><td>: <b>${s.nis || s.nisn}</b></td></tr>
                    <tr><td>Kelas</td><td>: ${s.kelas}</td></tr>
                    <tr><td>Username</td><td>: ${s.username}</td></tr>
                    <tr><td>Password</td><td>: ${s.password}</td></tr>
                </table>
                <div style="margin-top: 10px; text-align: right; font-size: 8pt;">
                    Kepala Sekolah,<br><br><br><b>${state.schoolProfile.kepsek || '................'}</b>
                </div>
            </div>
            ${(i + 1) % 8 === 0 ? '<div style="page-break-after: always;"></div>' : ''}
        `;
    });

    printWindow.document.write(`<html><head><title>Cetak Kartu</title></head><body>${kartuHtml}</body></html>`);
    printWindow.document.close();
    printWindow.print();
};

// --- 2. CETAK DAFTAR HADIR ---
window.cetakDaftarHadir = () => {
    const printWindow = window.open('', '_blank');
    let rows = '';
    
    state.masterSiswa.forEach((s, i) => {
        const no = i + 1;
        rows += `
            <tr>
                <td style="border:1px solid black; padding:8px; text-align:center;">${no}</td>
                <td style="border:1px solid black; padding:8px; text-align:center;">${s.nis || s.nisn}</td>
                <td style="border:1px solid black; padding:8px; text-transform:uppercase;">${s.nama}</td>
                <td style="border:1px solid black; padding:8px; width:15%;">${no % 2 !== 0 ? no + '. ........' : ''}</td>
                <td style="border:1px solid black; padding:8px; width:15%;">${no % 2 === 0 ? no + '. ........' : ''}</td>
            </tr>
        `;
    });

    const html = `
        <html><head><style>body { font-family: serif; padding: 20px; } table { width: 100%; border-collapse: collapse; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline;">DAFTAR HADIR PESERTA</h3>
            <table>
                <thead>
                    <tr>
                        <th style="border:1px solid black; padding:8px;">No</th>
                        <th style="border:1px solid black; padding:8px;">Nomor Peserta</th>
                        <th style="border:1px solid black; padding:8px;">Nama Lengkap</th>
                        <th style="border:1px solid black; padding:8px;" colspan="2">Tanda Tangan</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

// --- 3. CETAK BERITA ACARA ---
window.cetakBeritaAcara = () => {
    const p = state.schoolProfile || {};
    const printWindow = window.open('', '_blank');
    const html = `
        <html><head><style>body { font-family: serif; padding: 40px; line-height: 1.6; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline;">BERITA ACARA PELAKSANAAN</h3>
            <p>Pada hari ini .................... tanggal ....... bulan .................... tahun 2026, telah diselenggarakan Penilaian Berbasis Komputer:</p>
            <table style="width: 100%;">
                <tr><td width="30%">Satuan Pendidikan</td><td>: ${p.sekolah}</td></tr>
                <tr><td>Ruang / Sesi</td><td>: ............ / ............</td></tr>
                <tr><td>Mata Pelajaran</td><td>: ........................................</td></tr>
                <tr><td>Jumlah Peserta Seharusnya</td><td>: ............ Orang</td></tr>
                <tr><td>Jumlah Peserta Hadir</td><td>: ............ Orang</td></tr>
                <tr><td>Jumlah Peserta Tidak Hadir</td><td>: ............ Orang</td></tr>
            </table>
            <p style="margin-top: 20px;">Catatan Selama Ujian: <br><br> __________________________________________________________________</p>
            <table style="width:100%; margin-top: 50px;">
                <tr>
                    <td width="50%" align="center">Saksi / Pengawas,<br><br><br><br>(.................................)</td>
                    <td width="50%" align="center">Kepala Sekolah,<br><br><br><br><b>${p.kepsek || '................'}</b></td>
                </tr>
            </table>
        </body></html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

window.cetakPesertaUjian = () => {
    if (state.masterSiswa.length === 0) return alert("Data siswa belum dimuat!");

    const printWindow = window.open('', '_blank');
    let rows = '';
    
    // Urutkan berdasarkan Ruang, lalu Sesi, lalu Nama
    const sortedSiswa = [...state.masterSiswa].sort((a, b) => {
        if (a.ruang !== b.ruang) return (a.ruang || '').localeCompare(b.ruang || '');
        if (a.sesi !== b.sesi) return (a.sesi || '').localeCompare(b.sesi || '');
        return (a.nama || '').localeCompare(b.nama || '');
    });

    sortedSiswa.forEach((s, i) => {
        rows += `
            <tr>
                <td style="border:1px solid black; padding:5px; text-align:center;">${i + 1}</td>
                <td style="border:1px solid black; padding:5px; text-align:center;">${s.nis || s.nisn}</td>
                <td style="border:1px solid black; padding:5px;">${s.nama}</td>
                <td style="border:1px solid black; padding:5px; text-align:center;">${s.kelas}</td>
                <td style="border:1px solid black; padding:5px; text-align:center;">${s.ruang || '-'}</td>
                <td style="border:1px solid black; padding:5px; text-align:center;">${s.sesi || '-'}</td>
            </tr>`;
    });

    printWindow.document.write(`
        <html><head><title>Daftar Peserta Ujian</title><style>body{font-family:Arial; padding:20px;} table{width:100%; border-collapse:collapse; font-size:10pt;}</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center;">DAFTAR PESERTA UJIAN</h3>
            <table>
                <thead>
                    <tr style="background:#eee;">
                        <th style="border:1px solid black; padding:5px;">No</th>
                        <th style="border:1px solid black; padding:5px;">No Peserta</th>
                        <th style="border:1px solid black; padding:5px;">Nama Siswa</th>
                        <th style="border:1px solid black; padding:5px;">Kelas</th>
                        <th style="border:1px solid black; padding:5px;">Ruang</th>
                        <th style="border:1px solid black; padding:5px;">Sesi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

// --- 4. CETAK DAFTAR PESERTA UJIAN (NOMINATIF) ---
window.cetakPesertaUjian = () => {
    if (state.masterSiswa.length === 0) return alert("Data siswa belum dimuat! Pastikan ada siswa di Master Data.");

    const printWindow = window.open('', '_blank');
    let rows = '';

    // Mengurutkan siswa berdasarkan Ruang, Sesi, lalu Nama agar rapi di tabel
    const sortedSiswa = [...state.masterSiswa].sort((a, b) => {
        if (a.ruang !== b.ruang) return (a.ruang || '').localeCompare(b.ruang || '');
        if (a.sesi !== b.sesi) return (a.sesi || '').localeCompare(b.sesi || '');
        return (a.nama || '').localeCompare(b.nama || '');
    });

    sortedSiswa.forEach((s, i) => {
        rows += `
            <tr>
                <td style="border:1px solid black; padding:8px; text-align:center;">${i + 1}</td>
                <td style="border:1px solid black; padding:8px; text-align:center; font-weight:bold;">${s.nis || s.nisn || '-'}</td>
                <td style="border:1px solid black; padding:8px; text-transform:uppercase;">${s.nama || '-'}</td>
                <td style="border:1px solid black; padding:8px; text-align:center;">${s.kelas || '-'}</td>
                <td style="border:1px solid black; padding:8px; text-align:center; font-weight:bold;">${s.ruang || '-'}</td>
                <td style="border:1px solid black; padding:8px; text-align:center; font-weight:bold;">${s.sesi || '-'}</td>
            </tr>`;
    });

    const html = `
        <html><head><style>body { font-family: serif; padding: 20px; } table { width: 100%; border-collapse: collapse; font-size: 11pt; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline; margin-bottom: 20px;">DAFTAR NOMINATIF PESERTA UJIAN</h3>
            <table>
                <thead style="background-color: #f0f0f0;">
                    <tr>
                        <th style="border:1px solid black; padding:8px;">No</th>
                        <th style="border:1px solid black; padding:8px;">Nomor Peserta</th>
                        <th style="border:1px solid black; padding:8px;">Nama Lengkap</th>
                        <th style="border:1px solid black; padding:8px;">Kelas</th>
                        <th style="border:1px solid black; padding:8px;">Ruang</th>
                        <th style="border:1px solid black; padding:8px;">Sesi</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

// --- 5. CETAK JADWAL PENGAWAS ---
window.cetakJadwalPengawas = async () => {
    if (!state.pengawasUjian || Object.keys(state.pengawasUjian).length === 0) {
        // Tarik data pengawas jika belum tersedia di memori sementara
        const snap = await getDoc(doc(db, 'settings', 'pengawas_ujian'));
        if (snap.exists()) {
            state.pengawasUjian = snap.data();
        } else {
            return alert("Data alokasi pengawas belum diatur! Silakan atur di menu Pelaksanaan > Atur Pengawas.");
        }
    }

    const printWindow = window.open('', '_blank');
    let contentHtml = '';

    // Looping per Jenis Ujian (misal: PAS, PTS, dst)
    for (const jenisUjian in state.pengawasUjian) {
        let rows = '';
        const alokasi = state.pengawasUjian[jenisUjian];
        let no = 1;
        
        for (const key in alokasi) {
            const [ruang, sesi] = key.split('_');
            rows += `
                <tr>
                    <td style="border:1px solid black; padding:8px; text-align:center;">${no++}</td>
                    <td style="border:1px solid black; padding:8px; text-align:center; font-weight:bold;">${ruang}</td>
                    <td style="border:1px solid black; padding:8px; text-align:center;">${sesi}</td>
                    <td style="border:1px solid black; padding:8px; text-transform:uppercase;">${alokasi[key]}</td>
                </tr>`;
        }

        contentHtml += `
            <div style="margin-bottom: 30px;">
                <h4 style="margin-bottom: 10px;">JENIS PENILAIAN: <span style="text-decoration:underline;">${jenisUjian.toUpperCase()}</span></h4>
                <table style="width:100%; border-collapse:collapse; font-size: 11pt;">
                    <thead style="background-color: #f0f0f0;">
                        <tr>
                            <th style="border:1px solid black; padding:8px;">No</th>
                            <th style="border:1px solid black; padding:8px;">Ruang Ujian</th>
                            <th style="border:1px solid black; padding:8px;">Sesi</th>
                            <th style="border:1px solid black; padding:8px;">Nama Pengawas</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    const html = `
        <html><head><style>body { font-family: serif; padding: 20px; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline; margin-bottom: 30px;">JADWAL PENGAWAS UJIAN</h3>
            ${contentHtml}
        </body></html>`;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

window.cetakJadwalPengawas = async () => {
    // Ambil data penempatan pengawas dari settings
    const snap = await getDoc(doc(db, 'settings', 'pengawas_ujian'));
    if (!snap.exists()) return alert("Data alokasi pengawas belum diatur!");
    
    const pengawasData = snap.data();
    const printWindow = window.open('', '_blank');
    let contentHtml = '';

    // Loop per Jenis Ujian (PH, PTS, PAS, dll)
    for (const jenisUjian in pengawasData) {
        let rows = '';
        const alokasi = pengawasData[jenisUjian];
        
        for (const key in alokasi) {
            const [ruang, sesi] = key.split('_');
            rows += `
                <tr>
                    <td style="border:1px solid black; padding:8px;">${ruang}</td>
                    <td style="border:1px solid black; padding:8px; text-align:center;">${sesi}</td>
                    <td style="border:1px solid black; padding:8px; font-weight:bold;">${alokasi[key]}</td>
                </tr>`;
        }

        contentHtml += `
            <div style="margin-bottom:40px;">
                <h4 style="border-bottom:1px solid #ccc; padding-bottom:5px;">JENIS PENILAIAN: ${jenisUjian.toUpperCase()}</h4>
                <table style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                    <thead><tr style="background:#f0f0f0;"><th style="border:1px solid black; padding:8px;">Ruang</th><th style="border:1px solid black; padding:8px;">Sesi</th><th style="border:1px solid black; padding:8px;">Nama Pengawas</th></tr></thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
    }

    printWindow.document.write(`
        <html><head><title>Jadwal Pengawas</title><style>body{font-family:Arial; padding:20px;}</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center;">JADWAL PENGAWAS UJIAN</h3>
            ${contentHtml}
        </body></html>`);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

// ==========================================
// USER MANAGEMENT (GURU & SISWA)
// ==========================================
window.loadUserManagement = async () => {
    try {
        // 1. Load Data Admin (Ini posisi yang benar!)
        await loadAdmin();

        // 2. Load Data Guru
        const snapGuru = await getDocs(collection(db, 'master_guru'));
        state.masterGuru = [];
        snapGuru.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        
        // 3. Load Data Siswa
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        // 4. Urutkan siswa berdasarkan Kelas, lalu Nama
        state.masterSiswa.sort((a,b) => {
            if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
            return (a.kelas || '').localeCompare(b.kelas || '');
        });

        // 5. Render semua tabel
        window.renderTableUserGuru();
        window.renderTableUserSiswa();
    } catch(e) {
        console.error("Error load user management:", e);
    }
};

window.renderTableUserGuru = () => {
    const tb = document.getElementById('tableUserGuruBody');
    if (!tb) return;
    tb.innerHTML = '';
    
    if(state.masterGuru.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic bg-slate-50">Data Guru Kosong.</td></tr>';
        return;
    }

    state.masterGuru.forEach((g, i) => {
        const isActive = g.isActive !== false;
        
        // Tombol toggle status
        const btnStatus = isActive 
            ? `<button onclick="toggleStatusUser('master_guru', '${g.id}', true)" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">🚫 Nonaktifkan</button>`
            : `<button onclick="toggleStatusUser('master_guru', '${g.id}', false)" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">✔️ Aktifkan</button>`;

        container.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 ${!isActive ? 'opacity-50' : ''}">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <!-- PERUBAHAN: Menghapus class uppercase pada kolom nama -->
                <td class="p-3 border-r text-slate-800 font-bold text-sm">${g.nama || '-'}</td>
                <td class="p-3 border-r text-center text-blue-700 font-mono font-bold">${g.username || '-'}</td>
                <td class="p-3 border-r text-center text-slate-600 font-mono text-sm">${g.password || '-'}</td>
                <td class="p-3 border-r text-center">
                    <button onclick="alert('Reset sesi login untuk ${g.nama} berhasil.')" class="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded transition shadow-sm text-[10px] font-black uppercase w-full">🔄 Reset</button>
                </td>
                <td class="p-3 text-center w-32">${btnStatus}</td>
            </tr>
        `;
    });
};

window.renderTableUserSiswa = () => {
    const tb = document.getElementById('tableUserSiswaBody');
    if (!tb) return;
    tb.innerHTML = '';

    if(state.masterSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 italic bg-slate-50">Data Siswa Kosong.</td></tr>';
        return;
    }

    state.masterSiswa.forEach((s, i) => {
        const isActive = s.isActive !== false;
        
        // Tombol toggle status
        const btnStatus = isActive 
            ? `<button onclick="toggleStatusUser('master_siswa', '${s.id}', true)" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">🚫 Nonaktif</button>`
            : `<button onclick="toggleStatusUser('master_siswa', '${s.id}', false)" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">✔️ Aktif</button>`;

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 ${!isActive ? 'opacity-50' : ''}">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-slate-600 tracking-wider">${s.nis || s.nisn || '-'}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase text-sm">${s.nama || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-700">${s.kelas || '-'}</td>
                <td class="p-3 border-r text-center font-mono font-bold text-blue-700">${s.username || '-'}</td>
                <td class="p-3 border-r text-center font-mono text-sm text-slate-600">${s.password || '-'}</td>
                <td class="p-3 border-r text-center">
                    <button onclick="resetLoginSiswa('${s.id}', '${s.nama}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded transition shadow-sm text-[10px] font-black uppercase w-full">🔄 Reset</button>
                </td>
                <td class="p-3 text-center w-28">${btnStatus}</td>
            </tr>
        `;
    });
};

window.toggleStatusUser = async (collectionName, id, currentStatus) => {
    try {
        const newStatus = !currentStatus; // Balikkan status aktif ke nonaktif, atau sebaliknya
        await updateDoc(doc(db, collectionName, id), { isActive: newStatus });
        window.loadUserManagement(); // Muat ulang tabel agar perubahan langsung terlihat
    } catch(e) {
        console.error(e);
        alert("Gagal mengubah status pengguna.");
    }
};

// ==========================================
// BACKUP & RESTORE DATA
// ==========================================
window.loadBackup = async () => {
    try {
        const snap = await getDocs(collection(db, 'backup_history'));
        state.backupHistory = [];
        snap.forEach(d => state.backupHistory.push({id: d.id, ...d.data()}));

        // Urutkan dari yang paling baru
        state.backupHistory.sort((a,b) => b.timestamp - a.timestamp);

        window.renderTableBackup();
    } catch(e) {
        console.error("Error load backup history:", e);
    }
};

window.renderTableBackup = () => {
    // Mencari tbody secara spesifik di dalam section viewBackup
    const viewBackup = document.getElementById('viewBackup');
    const tb = viewBackup.querySelector('tbody');
    if (!tb) return;

    tb.innerHTML = '';

    if (!state.backupHistory || state.backupHistory.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada riwayat backup database.</td></tr>';
        return;
    }

    state.backupHistory.forEach((b, i) => {
        const dateStr = new Date(b.timestamp).toLocaleString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute:'2-digit'
        });

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r text-center font-mono text-slate-600 text-sm">${b.filename}</td>
                <td class="p-3 border-r text-center font-bold text-slate-700">${b.size}</td>
                <td class="p-3 border-r text-center text-slate-600 text-sm">${dateStr}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="hapusRiwayatBackup('${b.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow-sm text-[10px] font-bold uppercase transition">🗑️ Hapus Riwayat</button>
                </td>
            </tr>
        `;
    });
};

window.backupSemuaData = async () => {
    const btn = document.querySelector('#viewBackup button.bg-blue-500');
    if(btn) { btn.innerText = "SEDANG MEMPROSES..."; btn.disabled = true; }

    try {
        // Daftar semua koleksi yang ada di database CBT GARAM
        const collectionsToBackup = [
            'settings', 'master_guru', 'master_siswa', 'master_kelas',
            'master_subjects', 'master_jurusan', 'master_ekskul',
            'master_jenis_ujian', 'master_sesi_ujian', 'master_ruang_ujian',
            'master_bank_soal', 'master_jadwal_ujian', 'exam_results'
        ];

        const backupData = {};

        // Menarik semua data dari Firebase Firestore satu per satu
        for (const colName of collectionsToBackup) {
            const snap = await getDocs(collection(db, colName));
            backupData[colName] = [];
            snap.forEach(doc => {
                backupData[colName].push({ id: doc.id, ...doc.data() });
            });
        }

        // Convert object hasil tarikan ke format JSON String
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });

        // Hitung ukuran file untuk ditampilkan di riwayat
        const bytes = blob.size;
        const sizeStr = (bytes / 1024).toFixed(2) + " KB";

        // Buat penamaan file dinamis berdasarkan tanggal dan waktu
        const now = new Date();
        const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `backup_cbt_garam_${dateStr}.json`;

        // Proses trigger Download otomatis ke komputer user
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Simpan catatan riwayat backup ke database agar muncul di tabel
        await addDoc(collection(db, 'backup_history'), {
            filename: filename,
            size: sizeStr,
            timestamp: now.getTime()
        });

        alert("Backup berhasil! File JSON telah diunduh ke perangkat Anda.");
        window.loadBackup(); // Muat ulang tabel riwayat
    } catch (e) {
        console.error("Gagal backup:", e);
        alert("Terjadi kesalahan saat membackup data. Pastikan koneksi internet stabil.");
    } finally {
        if(btn) { btn.innerText = "BACKUP SEMUA DATA"; btn.disabled = false; }
    }
};

window.hapusRiwayatBackup = async (id) => {
    if(confirm("Hapus catatan riwayat backup ini? (Ini hanya menghapus catatan di tabel, bukan menghapus file JSON yang sudah Anda download)")) {
        await deleteDoc(doc(db, 'backup_history', id));
        window.loadBackup();
    }
};

// ==========================================
// FITUR TAMBAHAN: KATROL & EKSPOR ANALISA
// ==========================================

// Fungsi Katrol Nilai
window.katrolNilaiMassal = async () => {
    const kelasVal = document.getElementById('filterHasilKelas').value;
    const jadwalVal = document.getElementById('filterHasilJadwal').value;
    
    if (!kelasVal || !jadwalVal) return alert("Pilih Kelas dan Jadwal terlebih dahulu!");
    
    const filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);
    if (filteredResults.length === 0) return alert("Tidak ada data nilai untuk dikatrol pada jadwal ini.");

    const tambahPoin = prompt(`Ditemukan ${filteredResults.length} nilai siswa.\nMasukkan jumlah poin tambahan untuk semua siswa ini (contoh: 10):`, "0");
    
    if (!tambahPoin || isNaN(tambahPoin) || parseInt(tambahPoin) === 0) return;

    const poin = parseInt(tambahPoin);
    if (!confirm(`Anda akan menambahkan ${poin} poin ke ${filteredResults.length} siswa. Nilai maksimal dibatasi 100. Lanjutkan?`)) return;

    const btn = document.querySelector('button[onclick="katrolNilaiMassal()"]');
    if (btn) { btn.disabled = true; btn.innerText = "Memproses..."; }

    try {
        const promises = [];
        filteredResults.forEach(r => {
            let skorBaru = (r.skor || 0) + poin;
            if (skorBaru > 100) skorBaru = 100; // Batasi nilai mentok di 100
            if (skorBaru < 0) skorBaru = 0;
            
            promises.push(updateDoc(doc(db, 'exam_results', r.id), { skor: skorBaru }));
        });
        await Promise.all(promises);
        alert("Katrol nilai berhasil diterapkan!");
        loadHasilUjian(); // Refresh tabel nilai
    } catch (e) {
        console.error("Gagal katrol nilai:", e);
        alert("Gagal memproses penambahan nilai.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "⚖️ Katrol"; }
    }
};

// Fungsi Ekspor Analisa ke Excel
window.eksporAnalisaExcel = () => {
    const tb = document.getElementById('tableBodyAnalisa');
    if(!tb || tb.innerHTML.includes('Belum ada')) return alert("Tidak ada data analisa untuk diekspor!");
    
    // Ambil elemen tabel HTML dan langsung ubah jadi Excel
    const table = tb.closest('table');
    const workbook = XLSX.utils.table_to_book(table, {sheet: "Analisa Soal"});
    XLSX.writeFile(workbook, `Analisa_Butir_Soal_CBT.xlsx`);
};

// Injection otomatis untuk menghubungkan tombol HTML dengan fungsi JavaScript
setTimeout(() => {
    // Menyambungkan tombol sidebar agar me-load data backup saat diklik
    const btnMenuBackup = document.getElementById('btn-viewBackup');
    if (btnMenuBackup) {
        btnMenuBackup.addEventListener('click', () => { window.loadBackup(); });
    }

    // Mengganti alert bawaan tombol biru menjadi fungsi download sungguhan
    const btnProsesBackup = document.querySelector('#viewBackup button.bg-blue-500');
    if (btnProsesBackup) {
        btnProsesBackup.onclick = window.backupSemuaData;
    }
}, 1000);

// ==========================================
// PROFIL SEKOLAH & KOP SURAT
// ==========================================
window.loadProfil = async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'profil_sekolah'));
        if(snap.exists()) {
            const d = snap.data();
            
            // Fungsi helper untuk mengisi nilai input dengan aman
            const setVal = (id, val) => { 
                const el = document.getElementById(id);
                if(el) el.value = val || ''; 
            };
            
            setVal('profAplikasi', d.aplikasi);
            setVal('profNpsn', d.npsn);
            setVal('profSekolah', d.sekolah);
            setVal('profNss', d.nss);
            setVal('profWebsite', d.website);
            setVal('profJenjang', d.jenjang);
            setVal('profAlamat', d.alamat);
            setVal('profDesa', d.desa);
            setVal('profEmail', d.email);
            setVal('profFaksimili', d.faksimili);
            setVal('profKabupaten', d.kabupaten);
            setVal('profKodePos', d.kodePos);
            setVal('profKepsek', d.kepsek);
            setVal('profKecamatan', d.kecamatan);
            setVal('profNipKepsek', d.nipKepsek);
            setVal('profSatPend', d.satPend);
            setVal('profProvinsi', d.provinsi);
            setVal('profTelepon', d.telepon);

            // Set data gambar base64 ke input hidden
            if(d.logoKiri) document.getElementById('logoKiriBase64').value = d.logoKiri;
            if(d.logoKanan) document.getElementById('logoKananBase64').value = d.logoKanan;
            
            // Trigger pembaruan pratinjau (preview) di HTML
            if(window.updatePreviewKop) window.updatePreviewKop();
        }
    } catch(e) { 
        console.error("Error memuat profil:", e); 
    }
};

window.simpanProfil = async () => {
    const btn = document.getElementById('btnSimpanProfil');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }

    const data = {
        aplikasi: document.getElementById('profAplikasi').value,
        npsn: document.getElementById('profNpsn').value,
        sekolah: document.getElementById('profSekolah').value,
        nss: document.getElementById('profNss').value,
        website: document.getElementById('profWebsite').value,
        jenjang: document.getElementById('profJenjang').value,
        alamat: document.getElementById('profAlamat').value,
        desa: document.getElementById('profDesa').value,
        email: document.getElementById('profEmail').value,
        faksimili: document.getElementById('profFaksimili').value,
        kabupaten: document.getElementById('profKabupaten').value,
        kodePos: document.getElementById('profKodePos').value,
        kepsek: document.getElementById('profKepsek').value,
        kecamatan: document.getElementById('profKecamatan').value,
        nipKepsek: document.getElementById('profNipKepsek').value,
        satPend: document.getElementById('profSatPend').value,
        provinsi: document.getElementById('profProvinsi').value,
        telepon: document.getElementById('profTelepon').value,
        logoKiri: document.getElementById('logoKiriBase64').value,
        logoKanan: document.getElementById('logoKananBase64').value
    };

    try {
        await setDoc(doc(db, 'settings', 'profil_sekolah'), data);
        
        // Perbarui data di state lokal agar modul Cetak Berkas ikut ter-update
        state.schoolProfile = data; 
        
        alert("Profil Sekolah berhasil disimpan!");
        if(window.updatePreviewKop) window.updatePreviewKop();
    } catch(e) {
        console.error(e);
        alert("Gagal menyimpan Profil Sekolah.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan Profile"; }
    }
};

// Fungsi untuk membaca file gambar yang di-upload dan mengubahnya jadi text Base64
window.previewImage = (input, previewId, base64Id) => {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById(base64Id).value = e.target.result;
            if(window.updatePreviewKop) window.updatePreviewKop();
        };
        reader.readAsDataURL(input.files[0]);
    }
};

// Injection otomatis: Memastikan form Profil dimuat dari Firebase saat menu diklik
setTimeout(() => {
    const btnMenuProfil = document.getElementById('btn-viewProfil');
    if (btnMenuProfil) {
        btnMenuProfil.addEventListener('click', () => { window.loadProfil(); });
    }
}, 1000);

// ==========================================
// PENGUMUMAN & RUNNING TEXT
// ==========================================
window.loadPengumuman = async (isDashboard = false) => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'pengumuman_config'));
        let config = { r1: '', r2: '', r3: '', kepada: '', teks: '' };
        
        if (snap.exists()) {
            config = snap.data();
        }

        if (isDashboard) {
            // Tampilkan di widget dashboard
            const txt = config.teks ? config.teks : 'Tidak ada pengumuman.';
            const dashText = document.getElementById('dashPengumumanText');
            if (dashText) dashText.innerHTML = txt;
        } else {
            // Isi form di menu Pengumuman
            const setVal = (id, val) => { 
                const el = document.getElementById(id); 
                if(el) el.value = val || ''; 
            };
            
            setVal('rt1', config.r1);
            setVal('rt2', config.r2);
            setVal('rt3', config.r3);
            setVal('pengumumanKepada', config.kepada);
            setVal('pengumumanTeks', config.teks);
        }
    } catch(e) {
        console.error("Error load pengumuman:", e);
    }
};

window.simpanRunningText = async () => {
    // Ambil tombol simpan khusus untuk Running Text
    const btn = document.querySelector('#viewPengumuman .bg-white:nth-child(1) button.bg-blue-600');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }
    
    const data = {
        r1: document.getElementById('rt1').value,
        r2: document.getElementById('rt2').value,
        r3: document.getElementById('rt3').value
    };

    try {
        // Gunakan merge: true agar tidak menimpa data pengumuman utama
        await setDoc(doc(db, 'settings', 'pengumuman_config'), data, { merge: true });
        alert('Running text berhasil disimpan! Teks akan muncul di layar siswa.');
    } catch(e) {
        console.error(e);
        alert('Gagal menyimpan running text.');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan"; }
    }
};

window.simpanPengumuman = async () => {
    // Ambil tombol simpan khusus untuk Pengumuman Teks
    const btn = document.querySelector('#viewPengumuman .bg-white:nth-child(2) button.bg-blue-600');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }
    
    try {
        // Pindahkan pengambilan data ke dalam blok try agar error HTML (jika ada) ikut tertangkap
        const inputKepada = document.getElementById('pengumumanKepada');
        const inputTeks = document.getElementById('pengumumanTeks');

        // Cek dulu apakah elemen HTML-nya berhasil ditemukan
        if (!inputKepada || !inputTeks) {
            throw new Error("Elemen input HTML (pengumumanKepada / pengumumanTeks) tidak ditemukan di admin.html!");
        }

        const data = {
            kepada: inputKepada.value,
            teks: inputTeks.value
        };

        // CEK LANGKAH 1: Tampilkan data yang ditangkap ke Console
        console.log("Data Pengumuman yang siap disimpan:", data);

        // Gunakan merge: true agar tidak menimpa data running text
        await setDoc(doc(db, 'settings', 'pengumuman_config'), data, { merge: true });
        alert('Pengumuman berhasil disimpan!');
        
        // Segarkan teks pengumuman di Dashboard
        if (typeof loadDashboard === 'function') loadDashboard();
    } catch(e) {
        // CEK LANGKAH 2: Tangkap error apapun yang menggagalkan proses
        console.error("Proses simpan pengumuman GAGAL karena:", e);
        alert('Gagal menyimpan pengumuman. Cek pesan warna merah di Console!');
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan"; }
    }
};
// Injection otomatis: Memastikan data dimuat saat menu Pengumuman diklik
setTimeout(() => {
    const btnMenuPengumuman = document.getElementById('btn-viewPengumuman');
    if (btnMenuPengumuman) {
        btnMenuPengumuman.addEventListener('click', () => { window.loadPengumuman(false); });
    }
}, 1000);

// ==========================================
// BERSIHKAN DATA (HAPUS MASAL)
// ==========================================
window.loadBersihkan = async () => {
    try {
        // Pemetaan ID HTML ke nama koleksi di Firestore
        const collectionsMap = [
            { id: 'count_bs', name: 'master_bank_soal', label: 'Bank Soal' },
            { id: 'count_jdw', name: 'master_jadwal_ujian', label: 'Jadwal Ujian' },
            { id: 'count_nl', name: 'exam_results', label: 'Hasil Ujian (Nilai)' },
            { id: 'count_ss', name: 'master_sesi_ujian', label: 'Sesi Ujian' },
            { id: 'count_guru', name: 'master_guru', label: 'Master Guru' },
            { id: 'count_jrs', name: 'master_jurusan', label: 'Master Jurusan' },
            { id: 'count_kls', name: 'master_kelas', label: 'Master Kelas' },
            { id: 'count_mapel', name: 'master_subjects', label: 'Master Mapel' },
            { id: 'count_siswa', name: 'master_siswa', label: 'Master Siswa' }
        ];

        for (const c of collectionsMap) {
            const tdCount = document.getElementById(c.id);
            if (tdCount) {
                tdCount.innerText = '...'; // Indikator loading saat menghitung
                
                // Ambil jumlah data aktual dari Firestore
                const snap = await getDocs(collection(db, c.name));
                tdCount.innerText = snap.size;

                // Tanamkan fungsi onclick ke tombol di sebelah angka
                const tdAction = tdCount.nextElementSibling;
                if(tdAction) {
                    const btn = tdAction.querySelector('button');
                    if(btn) {
                        btn.onclick = () => window.kosongkanKoleksi(c.name, c.label, c.id);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Error load bersihkan data:", e);
    }
};

window.kosongkanKoleksi = async (collectionName, label, elementId) => {
    // 1. Peringatan Pertama
    const konfirmasi = confirm(`PERINGATAN KERAS!\n\nAnda yakin ingin MENGHAPUS SEMUA DATA [${label}]?\nAksi ini permanen dan tidak dapat dibatalkan!\n\nPastikan Anda sudah melakukan BACKUP di menu Backup/Restore.`);
    if (!konfirmasi) return;

    // 2. Peringatan Kedua (Khusus untuk tabel Master)
    if (collectionName.includes('master_')) {
        const konfirmasi2 = confirm(`Ini adalah Data Master (${label}). Menghapusnya dapat menyebabkan error pada relasi data lain. Tetap kosongkan?`);
        if(!konfirmasi2) return;
    }

    const tdCount = document.getElementById(elementId);
    const btn = tdCount.nextElementSibling.querySelector('button');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = 'Memproses...';
    btn.disabled = true;

    try {
        const snap = await getDocs(collection(db, collectionName));
        const promises = [];

        snap.forEach(docItem => {
            promises.push(deleteDoc(doc(db, collectionName, docItem.id)));
            
            // Khusus Bank Soal, kita harus membersihkan sub-koleksi butir soalnya juga
            if (collectionName === 'master_bank_soal') {
                getDocs(collection(db, `master_bank_soal/${docItem.id}/butir_soal`)).then(subSnap => {
                    subSnap.forEach(subDoc => {
                        deleteDoc(doc(db, `master_bank_soal/${docItem.id}/butir_soal`, subDoc.id));
                    });
                });
            }
        });

        // Eksekusi penghapusan massal
        await Promise.all(promises);
        
        // Reset state array lokal agar aplikasi terhindar dari membaca data yang sudah dihapus
        if(collectionName === 'master_siswa') state.masterSiswa = [];
        if(collectionName === 'master_guru') state.masterGuru = [];
        if(collectionName === 'master_kelas') state.masterKelas = [];
        if(collectionName === 'master_subjects') state.masterSubjects = [];
        if(collectionName === 'master_bank_soal') state.masterBankSoal = [];
        if(collectionName === 'master_jadwal_ujian') state.masterJadwalUjian = [];
        if(collectionName === 'exam_results') state.allResults = [];

        alert(`Seluruh data [${label}] berhasil dikosongkan!`);
        tdCount.innerText = '0'; // Set angka jadi 0 di UI
    } catch (e) {
        console.error("Gagal menghapus data:", e);
        alert(`Terjadi kesalahan saat menghapus data ${label}.`);
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
};

// Injection otomatis: Memastikan jumlah data dihitung saat menu diklik
setTimeout(() => {
    const btnMenuBersihkan = document.getElementById('btn-viewBersihkan');
    if (btnMenuBersihkan) {
        btnMenuBersihkan.addEventListener('click', () => { window.loadBersihkan(); });
    }
}, 1000);

window.hapusSeluruhDatabase = async () => {
    // 1. Verifikasi Keamanan Berlapis
    const confirm1 = confirm("PERINGATAN TINGKAT TINGGI!\n\nAnda akan menghapus SELURUH DATA aplikasi CBT GARAM.\nData Siswa, Guru, Bank Soal, Jadwal, dan Nilai akan hilang selamanya.\n\nApakah Anda benar-benar yakin?");
    if (!confirm1) return;

    const confirm2 = confirm("Peringatan Terakhir!\n\nPastikan Anda sudah melakukan BACKUP DATA terlebih dahulu.\n\nKlik OK jika Anda sudah siap melakukan Reset Total.");
    if (!confirm2) return;

    // Tambahkan verifikasi teks untuk mencegah kesalahan klik
    const verifyText = prompt("Ketik kata 'HAPUS' untuk mengonfirmasi penghapusan massal ini:");
    if (verifyText !== "HAPUS") {
        alert("Konfirmasi gagal. Data batal dihapus.");
        return;
    }

    // 2. Daftar Koleksi yang akan Dihapus (KECUALI master_admin)
    const collectionsToWipe = [
        'master_siswa', 'master_guru', 'master_kelas', 'master_subjects', 
        'master_jurusan', 'master_ekskul', 'master_jenis_ujian', 
        'master_sesi_ujian', 'master_ruang_ujian', 'master_bank_soal', 
        'master_jadwal_ujian', 'exam_results', 'backup_history', 'settings'
    ];

    alert("Proses penghapusan dimulai. Mohon tunggu sampai selesai...");

    try {
        for (const colName of collectionsToWipe) {
            const snap = await getDocs(collection(db, colName));
            const promises = [];

            snap.forEach(docItem => {
                // Hapus dokumen utama
                promises.push(deleteDoc(doc(db, colName, docItem.id)));

                // Logika khusus untuk sub-koleksi bank soal
                if (colName === 'master_bank_soal') {
                    getDocs(collection(db, `master_bank_soal/${docItem.id}/butir_soal`)).then(subSnap => {
                        subSnap.forEach(subDoc => {
                            deleteDoc(doc(db, `master_bank_soal/${docItem.id}/butir_soal`, subDoc.id));
                        });
                    });
                }
            });

            await Promise.all(promises);
            console.log(`Koleksi [${colName}] berhasil dibersihkan.`);
        }

        alert("DATABASE BERHASIL DIRESET TOTAL!\n\nKecuali akses login Admin. Sistem akan dimuat ulang untuk menyegarkan tampilan.");
        location.reload();

    } catch (error) {
        console.error("Gagal melakukan reset database:", error);
        alert("Terjadi kesalahan sistem saat menghapus data. Periksa koneksi internet Anda.");
    }
};

// ==========================================
// MANAJEMEN ADMIN PANITIA
// ==========================================
window.loadAdmin = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_admin'));
        state.masterAdmin = [];
        snap.forEach(d => state.masterAdmin.push({id: d.id, ...d.data()}));
        window.renderTableUserAdmin();
    } catch(e) { console.error("Error load admin:", e); }
};

window.renderTableUserAdmin = () => {
    const tb = document.getElementById('tableUserAdminBody');
    if(!tb) return;
    tb.innerHTML = '';
    
    if(state.masterAdmin.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Data Admin Kosong.</td></tr>';
        return;
    }
    
    state.masterAdmin.forEach((a, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r text-slate-500">${i+1}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase" colspan="2">${a.nama || 'ADMINISTRATOR'}</td>
                <td class="p-3 border-r text-center font-bold text-blue-700">${a.username}</td>
                <td class="p-3 border-r text-center text-slate-600 font-mono text-sm">${a.password}</td>
                <td class="p-3 border-r text-center font-bold text-slate-800"><span class="bg-blue-100 text-blue-700 px-2 py-1 rounded text-[10px] font-bold">SUPER ADMIN</span></td>
                <td class="p-3 border-r text-center text-slate-500">-</td>
                <td class="p-3 text-center"><span class="bg-green-500 text-white px-2 py-1 rounded text-[10px] font-bold">AKTIF</span></td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editAdmin('${a.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-2 py-1.5 rounded shadow-sm text-xs font-bold transition">✏️</button>
                    <button onclick="hapusAdmin('${a.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1.5 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalAdmin = () => {
    document.getElementById('adminId').value = '';
    document.getElementById('inputNamaAdmin').value = '';
    document.getElementById('inputUsernameAdmin').value = '';
    document.getElementById('inputPasswordAdmin').value = '';
    document.getElementById('modalAdmin').classList.remove('hidden');
};

window.simpanAdmin = async () => {
    const id = document.getElementById('adminId').value;
    const data = {
        nama: document.getElementById('inputNamaAdmin').value.trim().toUpperCase(),
        username: document.getElementById('inputUsernameAdmin').value.trim(),
        password: document.getElementById('inputPasswordAdmin').value.trim()
    };
    
    if(!data.username || !data.password) return alert("Username dan Password wajib diisi!");
    
    try {
        if(id) await updateDoc(doc(db, 'master_admin', id), data);
        else await addDoc(collection(db, 'master_admin'), data);
        closeModal('modalAdmin');
        alert("Data Admin berhasil disimpan!");
        loadAdmin();
    } catch(e) { 
        console.error(e); 
        alert("Gagal menyimpan data admin."); 
    }
};

window.editAdmin = (id) => {
    const a = state.masterAdmin.find(x => x.id === id);
    if(!a) return;
    document.getElementById('adminId').value = a.id;
    document.getElementById('inputNamaAdmin').value = a.nama || '';
    document.getElementById('inputUsernameAdmin').value = a.username || '';
    document.getElementById('inputPasswordAdmin').value = a.password || '';
    document.getElementById('modalAdmin').classList.remove('hidden');
};

window.hapusAdmin = async (id) => {
    if(state.masterAdmin.length <= 1) {
        return alert("PERINGATAN DITOLAK: Anda tidak boleh menghapus admin satu-satunya, nanti Anda tidak bisa login!");
    }
    if(confirm("Yakin ingin menghapus akses admin ini?")) {
        await deleteDoc(doc(db, 'master_admin', id));
        loadAdmin();
    }
};

// ==========================================
// FITUR OTOMATISASI: KENAIKAN KELAS
// ==========================================
window.kenaikanKelas = async () => {
    if(!confirm("⚠️ PERINGATAN!\n\nFitur ini akan menaikkan kelas semua siswa secara otomatis (contoh: Siswa kelas 1 menjadi kelas 2).\nSiswa kelas tertinggi (Kelas 6) akan otomatis ditandai sebagai ALUMNI/LULUS.\n\nPastikan data nilai tahun ini sudah di-backup. Lanjutkan?")) return;
    
    try {
        const promises = [];
        state.masterSiswa.forEach(s => {
            let kelasBaru = s.kelas;
            // Ambil angka dari teks kelas (misal "1A" jadi 1, "6" jadi 6)
            let num = parseInt(s.kelas);
            if(!isNaN(num)) {
                if(num >= 6) {
                    kelasBaru = "ALUMNI";
                } else {
                    // Naikkan angkanya (misal 1A -> 2A)
                    kelasBaru = (num + 1).toString() + s.kelas.replace(num, "");
                }
            }
            
            // Jika ada perubahan, push ke antrean update Firebase
            if(kelasBaru !== s.kelas) {
                promises.push(updateDoc(doc(db, 'master_siswa', s.id), { kelas: kelasBaru }));
            }
        });
        
        await Promise.all(promises);
        alert("Proses Kenaikan Kelas Massal Berhasil! Data siswa telah diperbarui.");
        loadSiswa(); // Refresh tabel siswa
    } catch(e) {
        console.error(e); 
        alert("Gagal memproses kenaikan kelas.");
    }
};

// ==========================================
// IMPORT & EXPORT EXCEL (GURU & SISWA)
// ==========================================

// ---------------- 1. DATA GURU ----------------
window.exportTemplateGuru = () => {
    let dataToExport = [];
    
    // Jika data sudah ada, export data tersebut. Jika kosong, buat template.
    if (state.masterGuru && state.masterGuru.length > 0) {
        dataToExport = state.masterGuru.map((g, i) => ({
            "No": i + 1,
            "NIP/NUPTK": g.nip || '',
            "Kode Guru": g.kode || '',
            "Nama Lengkap": g.nama || '',
            "Jabatan": g.jabatan || 'GURU KELAS',
            "Username": g.username || '',
            "Password": g.password || ''
        }));
    } else {
        dataToExport = [{
            "No": 1,
            "NIP/NUPTK": "198505052010011015", 
            "Kode Guru": "G01",
            "Nama Lengkap": "NAMA GURU CONTOH",
            "Jabatan": "GURU KELAS ATAU PENGAWAS",
            "Username": "guru01",
            "Password": "password123"
        }];
        alert("Karena data masih kosong, sistem men-download Template Format Excel.\nSilakan isi mulai dari baris ke-2 (hapus data contoh).");
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Guru");
    XLSX.writeFile(wb, "Data_Guru_CBT.xlsx");
};

window.triggerImportGuru = () => { document.getElementById('importGuruFile').click(); };

window.importGuru = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) return alert("File Excel kosong atau format tidak sesuai!");
            if (!confirm(`Ditemukan ${jsonData.length} baris data guru. Lanjutkan import ke database?`)) return;

            alert("Proses import sedang berjalan. Jangan tutup browser...");

            const promises = [];
            jsonData.forEach(row => {
                const nip = (row["NIP/NUPTK"] || '').toString().trim();
                const nama = (row["Nama Lengkap"] || '').toString().trim();
                if (!nama) return; // Lewati jika nama kosong

                const guruData = {
                    nip: nip,
                    kode: (row["Kode Guru"] || '').toString().trim().toUpperCase(),
                    nama: nama, // Tetap gunakan format besar kecil aslinya untuk gelar
                    jabatan: (row["Jabatan"] || 'GURU KELAS').toString().trim().toUpperCase(),
                    username: (row["Username"] || nip || nama.replace(/\s/g,'').toLowerCase()).toString().trim().toLowerCase(),
                    password: (row["Password"] || nip || '123456').toString().trim(),
                    isActive: true
                };

                // Cek data yang sudah ada berdasarkan NIP/NUPTK untuk Update/Add
                let existingGuru = nip ? state.masterGuru.find(g => g.nip === nip) : null;

                if (existingGuru) {
                    promises.push(updateDoc(doc(db, 'master_guru', existingGuru.id), guruData));
                } else {
                    promises.push(addDoc(collection(db, 'master_guru'), guruData));
                }
            });

            await Promise.all(promises);
            alert("Import Data Guru Berhasil!");
            window.loadGuru();
        } catch (err) {
            console.error("Gagal Import Guru:", err);
            alert("Gagal membaca file Excel. Pastikan Anda menggunakan file hasil download dari sistem ini.");
        } finally {
            event.target.value = ''; // Reset form file
        }
    };
    reader.readAsArrayBuffer(file);
};


// ---------------- 2. DATA SISWA ----------------
window.exportTemplateSiswa = () => {
    let dataToExport = [];
    
    if (state.masterSiswa && state.masterSiswa.length > 0) {
        dataToExport = state.masterSiswa.map((s, i) => ({
            "No": i + 1,
            "NISN": s.nisn || '',
            "NIS": s.nis || '',
            "Nama Lengkap": s.nama || '',
            "Jenis Kelamin (L/P)": s.jk || 'L',
            "Kelas": s.kelas || '',
            "Username": s.username || '',
            "Password": s.password || ''
        }));
    } else {
        dataToExport = [{
            "No": 1,
            "NISN": "0012345678",
            "NIS": "1234",
            "Nama Lengkap": "NAMA SISWA CONTOH",
            "Jenis Kelamin (L/P)": "L",
            "Kelas": "6",
            "Username": "0012345678",
            "Password": "password123"
        }];
        alert("Karena data masih kosong, sistem men-download Template Format Excel.\nSilakan isi mulai dari baris ke-2 (hapus data contoh).");
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data Siswa");
    XLSX.writeFile(wb, "Data_Siswa_CBT.xlsx");
};

window.triggerImportSiswa = () => { document.getElementById('importSiswaFile').click(); };

window.importSiswa = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet);

            if (jsonData.length === 0) return alert("File Excel kosong atau format tidak sesuai!");
            if (!confirm(`Ditemukan ${jsonData.length} baris data siswa. Lanjutkan import ke database?`)) return;

            alert("Proses import sedang berjalan. Jangan tutup browser...");

            const promises = [];
            jsonData.forEach(row => {
                const nisn = (row["NISN"] || '').toString().trim();
                const nama = (row["Nama Lengkap"] || '').toString().trim().toUpperCase();
                if (!nama) return;

                const siswaData = {
                    nisn: nisn,
                    nis: (row["NIS"] || '').toString().trim(),
                    nama: nama,
                    jk: (row["Jenis Kelamin (L/P)"] || 'L').toString().trim().toUpperCase(),
                    kelas: (row["Kelas"] || '').toString().trim().toUpperCase(),
                    username: (row["Username"] || nisn || nama.replace(/\s/g,'').toLowerCase()).toString().trim().toLowerCase(),
                    password: (row["Password"] || nisn || '123456').toString().trim(),
                    isActive: true
                };

                // Cek jika siswa sudah ada (berdasarkan NISN)
                let existingSiswa = nisn ? state.masterSiswa.find(s => s.nisn === nisn) : null;

                if (existingSiswa) {
                    promises.push(updateDoc(doc(db, 'master_siswa', existingSiswa.id), siswaData));
                } else {
                    promises.push(addDoc(collection(db, 'master_siswa'), siswaData));
                }
            });

            await Promise.all(promises);
            alert("Import Data Siswa Berhasil!");
            window.loadSiswa();
        } catch (err) {
            console.error("Gagal Import Siswa:", err);
            alert("Gagal membaca file Excel. Pastikan header tabel tidak diubah.");
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
};

// ==========================================
// FITUR GAMBAR & LIVE PREVIEW MATEMATIKA
// ==========================================

// Fungsi untuk me-render Live Preview (Rumus & HTML)
window.updatePreviewSoal = () => {
    const container = document.getElementById('previewSoalContainer');
    if (!container) return;
    
    // Ambil teks dari editor pertanyaan
    const teks = document.getElementById('editorPertanyaan').value;
    container.innerHTML = teks;
    
    // Perintahkan MathJax untuk merender ulang rumus matematika di dalam container tersebut
    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch(err => console.error("MathJax error:", err));
    }
};

// Fungsi cerdas untuk mengompres gambar dan menyisipkannya ke textarea
window.sisipkanGambar = (targetTextareaId) => {
    // Buat input file sementara
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Baca file gambar
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                // Proses Kompresi Gambar dengan Canvas (Penting agar Firebase tidak kepenuhan)
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Lebar maksimal gambar di layar ujian
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Ubah menjadi Base64 (Kualitas 70%)
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                
                // Buat tag HTML untuk disisipkan
                const imgTag = `\n<img src="${base64String}" style="max-width:100%; height:auto; margin-top:8px; border-radius:8px;" alt="gambar-soal">\n`;
                
                // Sisipkan tepat di posisi kursor pada Textarea
                const textarea = document.getElementById(targetTextareaId);
                const cursorPos = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursorPos);
                const textAfter = textarea.value.substring(cursorPos);
                
                textarea.value = textBefore + imgTag + textAfter;
                
                // Fokuskan kembali dan update preview (jika itu teks pertanyaan)
                textarea.focus();
                if(targetTextareaId === 'editorPertanyaan') updatePreviewSoal();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    
    input.click(); // Buka dialog pemilihan file
};
