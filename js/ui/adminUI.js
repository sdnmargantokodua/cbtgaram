import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs, query, where, orderBy, limit, startAfter, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// ============================================================================
// 1. SESSION & UI NAVIGATION
// ============================================================================
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
    document.getElementById('loginError').classList.add('hidden'); 
    
    let inputUser = document.getElementById('adminUsername').value.trim();
    const inputPass = document.getElementById('adminPassword').value.trim();
    const btnMasuk = document.getElementById('btnMasukAdmin');

    if (!inputUser || !inputPass) return alert("Username dan Sandi tidak boleh kosong!");

    if (!inputUser.includes('@')) inputUser = inputUser + '@cbt.local';

    const originalText = btnMasuk.innerText;
    btnMasuk.innerText = "Memeriksa Keamanan...";
    btnMasuk.disabled = true;

    try {
        const auth = getAuth();
        await signInWithEmailAndPassword(auth, inputUser, inputPass);
        localStorage.setItem('admin_logged_in', 'true');
        checkAdminSession(); 
    } catch (error) {
        console.error("Gagal login:", error.code);
        const errElement = document.getElementById('loginError');
        errElement.classList.remove('hidden'); 
        
        if(error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errElement.innerText = "Username atau Sandi Salah/Tidak Terdaftar!";
        } else if (error.code === 'auth/too-many-requests') {
            errElement.innerText = "Terlalu banyak percobaan gagal. Coba lagi nanti.";
        } else {
            errElement.innerText = "Gagal menghubungi server otentikasi.";
        }
    } finally {
        btnMasuk.innerText = originalText;
        btnMasuk.disabled = false;
    }
};

window.logoutAdmin = async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        localStorage.removeItem('admin_logged_in');
        location.reload();
    } catch (e) {
        console.error("Logout gagal:", e);
        alert("Terjadi kesalahan saat logout.");
    }
};

window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('-translate-x-full');
};

window.toggleNavMenu = (id) => {
    const menu = document.getElementById(id);
    const icon = document.getElementById('icon-' + id);
    if (menu) {
        if (menu.classList.contains('hidden')) {
            menu.classList.remove('hidden');
            menu.classList.add('block');
            if(icon) icon.classList.add('rotate-180');
        } else {
            menu.classList.add('hidden');
            menu.classList.remove('block');
            if(icon) icon.classList.remove('rotate-180');
        }
    }
};

window.closeModal = (id) => {
    document.getElementById(id).classList.add('hidden');
};

window.switchTab = (viewId, title) => {
    try {
        const targetView = document.getElementById(viewId);
        const targetBtn = document.getElementById('btn-' + viewId);

        if (!targetView) {
            console.error(`Error: Section ID "${viewId}" tidak ditemukan di HTML.`);
            return;
        }

        document.querySelectorAll('.view-section').forEach(s => {
            s.classList.add('hidden');
            s.classList.remove('block');
        });

        targetView.classList.remove('hidden');
        targetView.classList.add('block');

        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.innerText = title;

        document.querySelectorAll('.menu-btn').forEach(b => {
            b.classList.remove('bg-slate-800', 'text-blue-400', 'border-l-4', 'border-blue-500');
            b.classList.add('text-slate-300');
        });

        if (targetBtn) {
            targetBtn.classList.add('bg-slate-800', 'text-blue-400', 'border-l-4', 'border-blue-500');
            targetBtn.classList.remove('text-slate-300');
        }

        if (window.innerWidth < 768) toggleSidebar();
    } catch (err) {
        console.error("Gagal berpindah menu:", err);
    }
};

// Jalankan pengecekan sesi saat file dimuat
window.checkAdminSession();


// ============================================================================
// 2. DASHBOARD
// ============================================================================
window.loadDashboard = async () => {
    try {
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        const snapMapel = await getDocs(collection(db, 'master_subjects'));
        const snapKelas = await getDocs(collection(db, 'master_kelas'));
        const snapGuru = await getDocs(collection(db, 'master_guru'));

        if(document.getElementById('dashSiswa')) document.getElementById('dashSiswa').innerText = snapSiswa.size;
        if(document.getElementById('dashRombel')) document.getElementById('dashRombel').innerText = snapKelas.size;
        if(document.getElementById('dashGuru')) document.getElementById('dashGuru').innerText = snapGuru.size;
        if(document.getElementById('dashMapel')) document.getElementById('dashMapel').innerText = snapMapel.size;

        const snapRuang = await getDocs(collection(db, 'master_ruang_ujian'));
        const snapSesi = await getDocs(collection(db, 'master_sesi_ujian'));
        const snapBankSoal = await getDocs(collection(db, 'master_bank_soal'));
        const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
        const snapToken = await getDoc(doc(db, 'settings', 'token_ujian'));

        if(document.getElementById('dashRuang')) document.getElementById('dashRuang').innerText = snapRuang.size;
        if(document.getElementById('dashSesi')) document.getElementById('dashSesi').innerText = snapSesi.size;
        if(document.getElementById('dashBankSoal')) document.getElementById('dashBankSoal').innerText = snapBankSoal.size;
        if(document.getElementById('dashJadwal')) document.getElementById('dashJadwal').innerText = snapJadwal.size;
        
        if(document.getElementById('dashToken') && snapToken.exists()) {
            document.getElementById('dashToken').innerText = snapToken.data().currentToken || '-';
        }

        if (typeof window.loadPengumuman === 'function') {
            window.loadPengumuman(true);
        }

        const dashActivity = document.getElementById('dashActivity');
        if (dashActivity) {
            let activityHtml = '';
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


// ============================================================================
// 3. PENGATURAN UMUM & MASTER DATA UTAMA
// ============================================================================

// --- AKADEMIK (TAHUN & SEMESTER) ---
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

window.openModalTahun = (id = '', nama = '', status = 'Aktif') => {
    const elId = document.getElementById('tahunId');
    const elNama = document.getElementById('inputNamaTahun');
    const elStatus = document.getElementById('inputStatusTahun');
    const modal = document.getElementById('modalTahunPelajaran');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elStatus) elStatus.value = status;
    if (modal) modal.classList.remove('hidden');
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

// --- MATA PELAJARAN ---
window.loadMataPelajaran = async () => {
    const tb = document.getElementById('tableMapelBody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Memuat data...</td></tr>';
    try {
        const snap = await getDocs(collection(db, 'master_mapel'));
        state.masterMapel = [];
        snap.forEach(d => state.masterMapel.push({id: d.id, ...d.data()}));
        state.masterMapel.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderTableMapel();
    } catch(e) {
        console.error("Error load mapel:", e);
        tb.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Gagal memuat data: ${e.message}</td></tr>`;
    }
};

window.renderTableMapel = () => {
    const tb = document.getElementById('tableMapelBody');
    if (!tb) return;
    tb.innerHTML = '';
    if (!state.masterMapel || state.masterMapel.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data Mata Pelajaran.</td></tr>';
        return;
    }
    state.masterMapel.forEach((m, i) => {
        const isAktif = m.aktif !== false;
        const statusBadge = isAktif 
            ? '<span class="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700">AKTIF</span>' 
            : '<span class="px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-700">NONAKTIF</span>';

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r font-mono font-bold text-slate-600">${m.kode || '-'}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800">${m.nama || '-'}</td>
                <td class="p-3 text-center border-r text-slate-600 text-sm">${m.kelompok || '-'}</td>
                <td class="p-3 text-center border-r">${statusBadge}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editMapel('${m.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusMapel('${m.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalMapel = (id = '', kode = '', nama = '', kelompok = 'Kelompok A (Wajib)', status = true) => {
    const elId = document.getElementById('mapelId');
    const elKode = document.getElementById('inputKodeMapel');
    const elNama = document.getElementById('inputNamaMapel');
    const elKelompok = document.getElementById('inputKelompokMapel');
    const elStatus = document.getElementById('inputStatusMapel');
    const modal = document.getElementById('modalMataPelajaran');

    if (elId) elId.value = id;
    if (elKode) elKode.value = kode;
    if (elNama) elNama.value = nama;
    if (elKelompok) elKelompok.value = kelompok;
    if (elStatus) elStatus.checked = status; 
    if (modal) modal.classList.remove('hidden');
};

window.simpanMapel = async () => {
    try {
        const idMapel = document.getElementById('mapelId')?.value || '';
        const nama = document.getElementById('inputNamaMapel')?.value.trim();
        const kode = document.getElementById('inputKodeMapel')?.value.trim();
        const kelompok = document.getElementById('inputKelompokMapel')?.value;
        const aktif = document.getElementById('inputStatusMapel')?.checked;

        if (!nama || !kode) return alert('Gagal: Nama dan Kode wajib diisi!');

        const btnSimpan = document.querySelector('#modalMataPelajaran button[onclick="simpanMapel()"]');
        const teksAsli = btnSimpan ? btnSimpan.innerHTML : 'Simpan';
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = {
            nama: nama.toUpperCase(),
            kode: kode.toUpperCase(),
            kelompok: kelompok || 'Kelompok A (Wajib)',
            aktif: aktif !== false 
        };

        if (idMapel) {
            await updateDoc(doc(db, 'master_mapel', idMapel), payload);
        } else {
            await addDoc(collection(db, 'master_mapel'), payload);
        }

        if (btnSimpan) { btnSimpan.innerHTML = teksAsli; btnSimpan.disabled = false; }
        window.closeModal('modalMataPelajaran');
        window.loadMataPelajaran();

        if (document.getElementById('inputNamaMapel')) document.getElementById('inputNamaMapel').value = '';
        if (document.getElementById('inputKodeMapel')) document.getElementById('inputKodeMapel').value = '';

    } catch (error) {
        console.error("Gagal menyimpan Mapel:", error);
        alert('Terjadi kesalahan: ' + error.message);
    }
};

window.editMapel = (id) => {
    const mapel = state.masterMapel ? state.masterMapel.find(m => m.id === id) : null;
    if (!mapel) return;
    window.openModalMapel(mapel.id, mapel.kode, mapel.nama, mapel.kelompok, mapel.aktif);
};

window.hapusMapel = async (id) => {
    if(confirm("Hapus mapel ini?")) {
        await deleteDoc(doc(db, 'master_mapel', id));
        loadMataPelajaran();
    }
};

// --- JURUSAN ---
window.loadJurusan = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_jurusan'));
        state.masterJurusan = [];
        snap.forEach(d => state.masterJurusan.push({id: d.id, ...d.data()}));
        state.masterJurusan.sort((a,b) => (a.kode || '').localeCompare(b.kode || ''));
        window.renderTableJurusan();
    } catch(e) { console.error(e); }
};

window.renderTableJurusan = () => {
    const tb = document.getElementById('tableJurusanBody');
    if(!tb) return;
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

window.openModalJurusan = (id = '', kode = '', nama = '') => {
    const elId = document.getElementById('jurusanId');
    const elKode = document.getElementById('inputKodeJurusan');
    const elNama = document.getElementById('inputNamaJurusan');
    const modal = document.getElementById('modalJurusan');

    if (elId) elId.value = id;
    if (elKode) elKode.value = kode;
    if (elNama) elNama.value = nama;
    if (modal) modal.classList.remove('hidden');
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
    const jurusan = state.masterJurusan ? state.masterJurusan.find(j => j.id === id) : null;
    if (jurusan) window.openModalJurusan(jurusan.id, jurusan.kode, jurusan.nama);
};

window.hapusJurusan = async (id) => {
    if(confirm("Hapus jurusan?")) {
        await deleteDoc(doc(db, 'master_jurusan', id));
        loadJurusan();
    }
};

// --- KELAS / ROMBEL ---
window.loadKelas = async () => {
    const tb = document.getElementById('tableKelasBody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Memuat data...</td></tr>';
    try {
        const snap = await getDocs(collection(db, 'master_kelas'));
        state.masterKelas = [];
        snap.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
        state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderTableKelas();
    } catch(e) {
        console.error("Error load kelas:", e);
    }
};

window.renderTableKelas = () => {
    const tb = document.getElementById('tableKelasBody');
    if (!tb) return;
    tb.innerHTML = '';
    
    if (!state.masterKelas || state.masterKelas.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada data Kelas. Klik Tambah Kelas.</td></tr>';
        return;
    }

    state.masterKelas.forEach((k, i) => {
        let jmlSiswa = 0;
        if (state.masterSiswa) jmlSiswa = state.masterSiswa.filter(s => s.kelas === k.nama).length;

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r text-slate-500 font-bold">${i + 1}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800">${k.nama || '-'}</td>
                <td class="p-3 text-center border-r font-mono font-bold text-slate-600">${k.kode || '-'}</td>
                <td class="p-3 border-r text-slate-700">${k.wali || '-'}</td>
                <td class="p-3 text-center border-r font-bold text-blue-600">${jmlSiswa} Siswa</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editKelas('${k.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusKelas('${k.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalKelas = (id = '', nama = '', kode = '', wali = '') => {
    const elId = document.getElementById('kelasId');
    const elNama = document.getElementById('inputNamaKelas');
    const elKode = document.getElementById('inputKodeKelas');
    const elWali = document.getElementById('inputWaliKelas');
    const modal = document.getElementById('modalKelas');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elKode) elKode.value = kode;
    if (elWali) elWali.value = wali;
    if (modal) modal.classList.remove('hidden');
};

window.simpanKelas = async () => {
    try {
        const idKelas = document.getElementById('kelasId')?.value || '';
        const nama = document.getElementById('inputNamaKelas')?.value.trim();
        const kode = document.getElementById('inputKodeKelas')?.value.trim();
        const wali = document.getElementById('inputWaliKelas')?.value.trim();

        if (!nama) return alert('Gagal: Nama Kelas wajib diisi!');

        const btnSimpan = document.querySelector('#modalKelas button[onclick="simpanKelas()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = { nama: nama.toUpperCase(), kode: kode.toUpperCase(), wali: wali };

        if (idKelas) await updateDoc(doc(db, 'master_kelas', idKelas), payload);
        else await addDoc(collection(db, 'master_kelas'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }

        window.closeModal('modalKelas');
        window.loadKelas();

        if (document.getElementById('inputNamaKelas')) document.getElementById('inputNamaKelas').value = '';
        if (document.getElementById('inputKodeKelas')) document.getElementById('inputKodeKelas').value = '';
        if (document.getElementById('inputWaliKelas')) document.getElementById('inputWaliKelas').value = '';
    } catch (error) {
        console.error("Gagal menyimpan Kelas:", error);
        alert('Terjadi kesalahan: ' + error.message);
    }
};

window.editKelas = (id) => {
    const kelas = state.masterKelas ? state.masterKelas.find(k => k.id === id) : null;
    if (kelas) window.openModalKelas(kelas.id, kelas.nama, kelas.kode, kelas.wali);
};

window.hapusKelas = async (id) => {
    if(confirm("Hapus kelas? Pastikan tidak ada siswa di kelas ini.")) {
        await deleteDoc(doc(db, 'master_kelas', id));
        loadKelas();
    }
};

// --- EKSTRAKURIKULER & PENEMPATAN ---
window.loadEkskul = async () => {
    try {
        if(!state.masterKelas || state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        const snap = await getDocs(collection(db, 'master_ekskul'));
        state.masterEkskul = [];
        snap.forEach(d => state.masterEkskul.push({id: d.id, ...d.data()}));
        state.masterEkskul.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));

        const penempatanSnap = await getDoc(doc(db, 'settings', 'penempatan_ekskul'));
        if(penempatanSnap.exists()) {
            state.penempatanEkskul = penempatanSnap.data();
        } else {
            state.penempatanEkskul = {};
        }

        window.renderTableEkskul();
        window.renderPenempatanEkskul();
    } catch(e) { console.error("Error load ekskul:", e); }
};

window.renderTableEkskul = () => {
    const tb = document.getElementById('tableEkskulBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!state.masterEkskul || state.masterEkskul.length === 0) {
        tb.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 italic">Belum ada data Ekstrakurikuler.</td></tr>';
        return;
    }

    state.masterEkskul.forEach((e, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition">
                <td class="p-4 text-center border-r text-slate-400 font-bold">${i+1}</td>
                <td class="p-4 border-r font-bold text-slate-700 uppercase">${e.nama}</td>
                <td class="p-4 border-r text-center font-mono font-bold text-blue-600">${e.kode}</td>
                <td class="p-4 text-center space-x-1">
                    <button onclick="editEkskul('${e.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1.5 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusEkskul('${e.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>`;
    });
};

window.openModalEkskul = (id = '', nama = '', kode = '') => {
    const elId = document.getElementById('ekskulId');
    const elNama = document.getElementById('inputNamaEkskul');
    const elKode = document.getElementById('inputKodeEkskul');
    const modal = document.getElementById('modalEkskul');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elKode) elKode.value = kode;
    if (modal) modal.classList.remove('hidden');
};

window.editEkskul = (id) => {
    const e = state.masterEkskul.find(x => x.id === id);
    if(e) window.openModalEkskul(e.id, e.nama, e.kode);
};

window.simpanEkskul = async () => {
    try {
        const idEkskul = document.getElementById('ekskulId')?.value || '';
        const nama = document.getElementById('inputNamaEkskul')?.value.trim();
        const kode = document.getElementById('inputKodeEkskul')?.value.trim();

        if (!nama) return alert('Gagal: Nama Ekstrakurikuler wajib diisi!');

        const btnSimpan = document.querySelector('#modalEkskul button[onclick="simpanEkskul()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = { nama: nama.toUpperCase(), kode: (kode || '').toUpperCase() };

        if (idEkskul) await updateDoc(doc(db, 'master_ekskul', idEkskul), payload);
        else await addDoc(collection(db, 'master_ekskul'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }

        window.closeModal('modalEkskul');
        window.loadEkskul();

        if (document.getElementById('inputNamaEkskul')) document.getElementById('inputNamaEkskul').value = '';
        if (document.getElementById('inputKodeEkskul')) document.getElementById('inputKodeEkskul').value = '';
    } catch (error) {
        console.error("Gagal menyimpan Ekskul:", error);
        alert('Terjadi kesalahan: ' + error.message);
    }
};

window.hapusEkskul = async (id) => {
    if(confirm("Yakin ingin menghapus Ekstrakurikuler ini?")) {
        try {
            await deleteDoc(doc(db, 'master_ekskul', id));
            loadEkskul(); 
        } catch(e) { console.error(e); }
    }
};

window.renderPenempatanEkskul = () => {
    const container = document.getElementById('containerPenempatanEkskul');
    if(!container) return;
    container.innerHTML = '';
    
    if (!state.masterEkskul || state.masterEkskul.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic p-2 border rounded bg-white">Tambahkan data ekstrakurikuler terlebih dahulu.</p>';
        return;
    }
    if (!state.masterKelas || state.masterKelas.length === 0) {
        container.innerHTML = '<p class="text-sm text-slate-500 italic p-2 border rounded bg-white">Data Kelas masih kosong. Tambahkan kelas terlebih dahulu.</p>';
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
    const btn = document.querySelector('button[onclick="simpanPenempatanEkskul()"]');
    if(btn) { btn.innerText = "Menyimpan..."; btn.disabled = true; }

    const dataToSave = {};
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

// --- DATA MASTER GURU ---
window.loadGuru = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_guru'));
        state.masterGuru = [];
        snap.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        state.masterGuru.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderGridGuru();
    } catch(e) { console.error("Error load guru:", e); }
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

window.openModalGuru = (id = '', nip = '', kode = '', nama = '', username = '', password = '', status = true) => {
    const elId = document.getElementById('guruId');
    const elNip = document.getElementById('guruNip');
    const elKode = document.getElementById('guruKode');
    const elNama = document.getElementById('guruNama');
    const elUsername = document.getElementById('guruUsername');
    const elPassword = document.getElementById('guruPassword');
    const elStatus = document.getElementById('guruStatus');
    const modal = document.getElementById('modalGuru');

    if (elId) elId.value = id;
    if (elNip) elNip.value = nip;
    if (elKode) elKode.value = kode;
    if (elNama) elNama.value = nama;
    if (elUsername) elUsername.value = username;
    if (elPassword) elPassword.value = password;
    if (elStatus) elStatus.checked = status;
    if (modal) modal.classList.remove('hidden');
};

window.editGuru = (id) => {
    const guru = state.masterGuru ? state.masterGuru.find(g => g.id === id) : null;
    if (guru) window.openModalGuru(guru.id, guru.nip, guru.kode, guru.nama, guru.username, guru.password, guru.isActive !== false);
};

window.simpanGuru = async () => {
    try {
        const idGuru = document.getElementById('guruId')?.value || '';
        const nip = document.getElementById('guruNip')?.value.trim();
        const kode = document.getElementById('guruKode')?.value.trim();
        const nama = document.getElementById('guruNama')?.value.trim();
        const username = document.getElementById('guruUsername')?.value.trim();
        const password = document.getElementById('guruPassword')?.value;
        const statusAktif = document.getElementById('guruStatus')?.checked;

        if (!nama) return alert('Gagal: Nama Lengkap Guru wajib diisi!');

        const btnSimpan = document.querySelector('#modalGuru button[onclick="simpanGuru()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = {
            nip: nip || '',
            kode: (kode || '').toUpperCase(),
            nama: nama.toUpperCase(),
            username: (username || '').toLowerCase(),
            password: password || '',
            isActive: statusAktif !== false 
        };

        if (idGuru) await updateDoc(doc(db, 'master_guru', idGuru), payload);
        else await addDoc(collection(db, 'master_guru'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }

        window.closeModal('modalGuru');
        if (typeof window.loadGuru === 'function') window.loadGuru();

        ['guruId', 'guruNip', 'guruKode', 'guruNama', 'guruUsername', 'guruPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (document.getElementById('guruStatus')) document.getElementById('guruStatus').checked = true;
    } catch (error) {
        console.error("Gagal menyimpan Guru:", error);
        alert('Terjadi kesalahan: ' + error.message);
    }
};

window.hapusGuru = async (id) => {
    if(confirm("Yakin ingin menghapus data guru ini?")) {
        try {
            await deleteDoc(doc(db, 'master_guru', id));
            loadGuru(); 
        } catch(e) { console.error(e); }
    }
};

window.editJabatanGuru = async (id) => {
    const g = state.masterGuru.find(x => x.id === id);
    if(!g) return;
    const jabatanBaru = prompt(`Masukkan Jabatan untuk ${g.nama}\n(Contoh: Wali Kelas 5A, Guru PAI, dll):`, g.jabatan || "Guru Kelas");
    if(jabatanBaru !== null && jabatanBaru.trim() !== "") {
        try {
            await updateDoc(doc(db, 'master_guru', id), { jabatan: jabatanBaru.toUpperCase() });
            loadGuru();
        } catch(e) { console.error(e); }
    }
};

window.exportGuru = () => {
    let dataExport = [];
    if (state.masterGuru && state.masterGuru.length > 0) {
        dataExport = state.masterGuru.map((g, i) => ({
            "NO": i + 1,
            "NIP_NUPTK": g.nip || "",
            "KODE_GURU": g.kode || "",
            "NAMA_LENGKAP": g.nama || "",
            "USERNAME": g.username || "",
            "PASSWORD": g.password || ""
        }));
    } else {
        dataExport = [{
            "NO": 1,
            "NIP_NUPTK": "198001012005011001",
            "KODE_GURU": "GR01",
            "NAMA_LENGKAP": "NAMA GURU CONTOH, S.Pd",
            "USERNAME": "guru01",
            "PASSWORD": "password123"
        }];
        alert("Karena data guru kosong, sistem mengunduh Template Excel.");
    }
    try {
        const ws = XLSX.utils.json_to_sheet(dataExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data_Guru");
        XLSX.writeFile(wb, "Data_Atau_Template_Guru.xlsx");
    } catch (error) {
        console.error("Gagal mengexport file:", error);
    }
};

// --- DATA MASTER SISWA (PAGINATED) ---
state.siswaLimit = 50;          
state.siswaLastDoc = null;      
state.siswaHasMore = true;      
state.unsubscribeStatus = null; 

window.loadSiswa = async (isLoadMore = false) => {
    const tb = document.getElementById('tableSiswaBody');
    const btnLoadMore = document.getElementById('btnLoadMoreSiswa');
    
    if (!isLoadMore) {
        state.masterSiswa = [];
        state.siswaLastDoc = null;
        state.siswaHasMore = true;
        if(tb) tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Memuat data siswa...</td></tr>';
    }

    if (!state.siswaHasMore) return;
    if (btnLoadMore) btnLoadMore.innerText = "Memuat...";

    try {
        let q;
        if (state.siswaLastDoc) {
            q = query(collection(db, 'master_siswa'), orderBy('nama'), startAfter(state.siswaLastDoc), limit(state.siswaLimit));
        } else {
            q = query(collection(db, 'master_siswa'), orderBy('nama'), limit(state.siswaLimit));
        }

        const snap = await getDocs(q);
        
        if (snap.empty && !isLoadMore) {
            state.siswaHasMore = false;
            if(tb) tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data siswa di database.</td></tr>';
            if(btnLoadMore) btnLoadMore.classList.add('hidden');
            return;
        }

        state.siswaLastDoc = snap.docs[snap.docs.length - 1];
        snap.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));
        
        state.masterSiswa.sort((a,b) => {
            if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
            return (a.kelas || '').localeCompare(b.kelas || '');
        });

        window.renderTableSiswa(); 

        if (snap.docs.length < state.siswaLimit) {
            state.siswaHasMore = false;
            if(btnLoadMore) btnLoadMore.classList.add('hidden');
        } else {
            if(btnLoadMore) {
                btnLoadMore.classList.remove('hidden');
                btnLoadMore.innerHTML = "⬇️ Muat Lebih Banyak Siswa";
            }
        }
    } catch (e) {
        console.error("Error load siswa:", e);
        if(tb && !isLoadMore) tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-red-500 font-bold">Gagal memuat data. Periksa Index Firestore Anda.</td></tr>';
    } finally {
        if(btnLoadMore && state.siswaHasMore) btnLoadMore.innerHTML = "⬇️ Muat Lebih Banyak Siswa";
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

window.openModalSiswa = (id = '', nisn = '', nis = '', nama = '', jk = 'L', kelas = '', username = '', password = '') => {
    const elId = document.getElementById('siswaId');
    const elNisn = document.getElementById('siswaNisn');
    const elNis = document.getElementById('siswaNis');
    const elNama = document.getElementById('siswaNama');
    const elJk = document.getElementById('siswaJk');
    const elKelas = document.getElementById('siswaKelas');
    const elUsername = document.getElementById('siswaUsername');
    const elPassword = document.getElementById('siswaPassword');
    const modal = document.getElementById('modalSiswa');

    if (elId) elId.value = id;
    if (elNisn) elNisn.value = nisn;
    if (elNis) elNis.value = nis;
    if (elNama) elNama.value = nama;
    if (elJk) elJk.value = jk;
    if (elKelas) elKelas.value = kelas;
    if (elUsername) elUsername.value = username;
    if (elPassword) elPassword.value = password;

    if (modal) modal.classList.remove('hidden');
};

window.editSiswa = (id) => {
    const siswa = state.masterSiswa ? state.masterSiswa.find(s => s.id === id) : null;
    if (siswa) window.openModalSiswa(siswa.id, siswa.nisn, siswa.nis, siswa.nama, siswa.jk, siswa.kelas, siswa.username, siswa.password);
};

window.simpanSiswa = async () => {
    try {
        const idSiswa = document.getElementById('siswaId')?.value || '';
        const nisn = document.getElementById('siswaNisn')?.value.trim();
        const nis = document.getElementById('siswaNis')?.value.trim();
        const nama = document.getElementById('siswaNama')?.value.trim();
        const jk = document.getElementById('siswaJk')?.value;
        const kelas = document.getElementById('siswaKelas')?.value.trim();
        const username = document.getElementById('siswaUsername')?.value.trim();
        const password = document.getElementById('siswaPassword')?.value;
        const statusAktif = document.getElementById('siswaStatus')?.checked ?? true;

        if (!nama) return alert('Gagal: Nama Lengkap Siswa wajib diisi!');

        const btnSimpan = document.querySelector('#modalSiswa button[onclick="simpanSiswa()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = {
            nisn: nisn || '',
            nis: nis || '',
            nama: nama.toUpperCase(),
            jk: jk,
            kelas: kelas.toUpperCase(),
            username: (username || '').toLowerCase(),
            password: password || '',
            isActive: statusAktif
        };

        if (idSiswa) await updateDoc(doc(db, 'master_siswa', idSiswa), payload);
        else await addDoc(collection(db, 'master_siswa'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }
        window.closeModal('modalSiswa');
        if (typeof window.loadSiswa === 'function') window.loadSiswa();

        ['siswaId', 'siswaNisn', 'siswaNis', 'siswaNama', 'siswaKelas', 'siswaUsername', 'siswaPassword'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        if (document.getElementById('siswaJk')) document.getElementById('siswaJk').value = 'L';
        if (document.getElementById('siswaStatus')) document.getElementById('siswaStatus').checked = true;

    } catch (error) {
        console.error("Gagal menyimpan Siswa:", error);
        alert('Terjadi kesalahan: ' + error.message);
    }
};

window.hapusSiswa = async (id) => {
    if(confirm("Yakin ingin menghapus data siswa ini?")) {
        try {
            await deleteDoc(doc(db, 'master_siswa', id));
            loadSiswa(); 
        } catch(e) { console.error(e); }
    }
};

window.importSiswa = () => {
    const inputExcel = document.createElement('input');
    inputExcel.type = 'file';
    inputExcel.accept = '.xlsx, .xls'; 
    
    inputExcel.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return; 
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);

                if (jsonData.length === 0) return alert("File Excel kosong atau format tidak sesuai!");
                if (!confirm(`Ditemukan ${jsonData.length} baris data siswa. Lanjutkan import ke database?`)) return;

                alert("Proses import sedang berjalan. Jangan tutup browser...");
                const promises = [];
                
                jsonData.forEach(row => {
                    const nisn = (row["NISN"] || '').toString().trim();
                    const nama = (row["NAMA_LENGKAP"] || row["Nama Lengkap"] || '').toString().trim().toUpperCase();
                    if (!nama) return; 

                    const siswaData = {
                        nisn: nisn,
                        nis: (row["NIS"] || '').toString().trim(),
                        nama: nama,
                        jk: (row["JENIS_KELAMIN"] || row["Jenis Kelamin (L/P)"] || 'L').toString().trim().toUpperCase(),
                        kelas: (row["KELAS"] || row["Kelas"] || '').toString().trim().toUpperCase(),
                        username: (row["USERNAME"] || row["Username"] || nisn || nama.replace(/\s/g,'').toLowerCase()).toString().trim().toLowerCase(),
                        password: (row["PASSWORD"] || row["Password"] || nisn || '123456').toString().trim(),
                        isActive: true
                    };

                    let existingSiswa = nisn ? state.masterSiswa.find(s => s.nisn === nisn) : null;
                    if (existingSiswa) {
                        promises.push(updateDoc(doc(db, 'master_siswa', existingSiswa.id), siswaData));
                    } else {
                        promises.push(addDoc(collection(db, 'master_siswa'), siswaData));
                    }
                });

                await Promise.all(promises);
                alert("Import Data Siswa Berhasil!");
                if (typeof window.loadSiswa === 'function') window.loadSiswa();
            } catch (err) {
                console.error("Gagal Import Siswa:", err);
                alert("Gagal membaca file Excel. Pastikan format tabel sesuai.");
            }
        };
        reader.readAsArrayBuffer(file);
    };
    inputExcel.click();
};

window.exportSiswa = () => {
    let dataExport = [];
    if (state.masterSiswa && state.masterSiswa.length > 0) {
        dataExport = state.masterSiswa.map((s, i) => ({
            "NO": i + 1,
            "NISN": s.nisn || "",
            "NIS": s.nis || "",
            "NAMA_LENGKAP": s.nama || "",
            "JENIS_KELAMIN": s.jk || "",
            "KELAS": s.kelas || "",
            "USERNAME": s.username || "",
            "PASSWORD": s.password || ""
        }));
    } else {
        dataExport = [{
            "NO": 1,
            "NISN": "0123456789",
            "NIS": "1234",
            "NAMA_LENGKAP": "NAMA SISWA CONTOH",
            "JENIS_KELAMIN": "L",
            "KELAS": "6A",
            "USERNAME": "siswa01",
            "PASSWORD": "password123"
        }];
        alert("Karena data siswa kosong, sistem mengunduh Template Excel.");
    }
    try {
        const ws = XLSX.utils.json_to_sheet(dataExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Data_Siswa");
        XLSX.writeFile(wb, "Data_Atau_Template_Siswa.xlsx");
    } catch (error) {
        console.error("Gagal mengexport file:", error);
    }
};

window.kenaikanKelas = async () => {
    if(!confirm("⚠️ PERINGATAN!\n\nFitur ini akan menaikkan kelas semua siswa secara otomatis (contoh: Siswa kelas 1 menjadi kelas 2).\nSiswa kelas tertinggi (Kelas 6) akan otomatis ditandai sebagai ALUMNI/LULUS.\n\nPastikan data nilai tahun ini sudah di-backup. Lanjutkan?")) return;
    try {
        const promises = [];
        state.masterSiswa.forEach(s => {
            let kelasBaru = s.kelas;
            let num = parseInt(s.kelas);
            if(!isNaN(num)) {
                if(num >= 6) {
                    kelasBaru = "ALUMNI";
                } else {
                    kelasBaru = (num + 1).toString() + s.kelas.replace(num, "");
                }
            }
            if(kelasBaru !== s.kelas) {
                promises.push(updateDoc(doc(db, 'master_siswa', s.id), { kelas: kelasBaru }));
            }
        });
        await Promise.all(promises);
        alert("Proses Kenaikan Kelas Massal Berhasil! Data siswa telah diperbarui.");
        loadSiswa(); 
    } catch(e) {
        console.error(e); 
        alert("Gagal memproses kenaikan kelas.");
    }
};


// ============================================================================
// 4. PENGATURAN RUANG, SESI & JENIS UJIAN
// ============================================================================

// --- JENIS UJIAN ---
window.loadJenisUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_jenis_ujian'));
        state.masterJenisUjian = [];
        snap.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()}));

        if(state.masterJenisUjian.length === 0) {
            const defaultJenis = [
                { nama: 'Penilaian Harian', kode: 'PH', noUrut: 1 },
                { nama: 'Penilaian Akhir Semester', kode: 'PAS', noUrut: 3 }
            ];
            for (const j of defaultJenis) {
                const docRef = await addDoc(collection(db, 'master_jenis_ujian'), j);
                state.masterJenisUjian.push({ id: docRef.id, ...j });
            }
        }
        state.masterJenisUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableJenisUjian();
    } catch(e) { console.error("Error load jenis ujian:", e); }
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

window.openModalJenisUjian = (id = '', nama = '', kode = '') => {
    const elId = document.getElementById('jenisUjianId');
    const elNama = document.getElementById('inputNamaJenisUjian');
    const elKode = document.getElementById('inputKodeJenisUjian');
    const modal = document.getElementById('modalJenisUjian');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elKode) elKode.value = kode;
    if (modal) modal.classList.remove('hidden');
};

window.editJenisUjian = (id) => {
    const ujian = state.masterJenisUjian ? state.masterJenisUjian.find(u => u.id === id) : null;
    if (ujian) window.openModalJenisUjian(ujian.id, ujian.nama, ujian.kode);
};

window.simpanJenisUjian = async () => {
    try {
        const idUjian = document.getElementById('jenisUjianId')?.value || '';
        const nama = document.getElementById('inputNamaJenisUjian')?.value.trim();
        const kode = document.getElementById('inputKodeJenisUjian')?.value.trim();

        if (!nama) return alert('Gagal: Nama Jenis Ujian wajib diisi!');

        const btnSimpan = document.querySelector('#modalJenisUjian button[onclick="simpanJenisUjian()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳...'; btnSimpan.disabled = true; }

        const payload = { nama: nama.toUpperCase(), kode: (kode || '').toUpperCase() };

        if (idUjian) await updateDoc(doc(db, 'master_jenis_ujian', idUjian), payload);
        else await addDoc(collection(db, 'master_jenis_ujian'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }
        window.closeModal('modalJenisUjian');
        if (typeof window.loadJenisUjian === 'function') window.loadJenisUjian();
    } catch (error) {
        console.error("Gagal menyimpan:", error);
    }
};

window.hapusJenisUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Jenis Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_jenis_ujian', id));
            loadJenisUjian();
        } catch(e) { console.error(e); }
    }
};

// --- SESI UJIAN ---
window.loadSesiUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_sesi_ujian'));
        state.masterSesiUjian = [];
        snap.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));

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
        state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableSesiUjian();
    } catch(e) { console.error("Error load sesi ujian:", e); }
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

window.openModalSesiUjian = (id = '', nama = '', waktu = '') => {
    const elId = document.getElementById('sesiUjianId');
    const elNama = document.getElementById('inputNamaSesi');
    const elWaktu = document.getElementById('inputWaktuSesi');
    const modal = document.getElementById('modalSesiUjian');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elWaktu) elWaktu.value = waktu;
    if (modal) modal.classList.remove('hidden');
};

window.editSesiUjian = (id) => {
    const sesi = state.masterSesiUjian ? state.masterSesiUjian.find(s => s.id === id) : null;
    if (sesi) window.openModalSesiUjian(sesi.id, sesi.nama, sesi.waktu);
};

window.simpanSesiUjian = async () => {
    try {
        const idSesi = document.getElementById('sesiUjianId')?.value || '';
        const nama = document.getElementById('inputNamaSesi')?.value.trim();
        const waktu = document.getElementById('inputWaktuSesi')?.value.trim();

        if (!nama) return alert('Gagal: Nama Sesi wajib diisi!');

        const btnSimpan = document.querySelector('#modalSesiUjian button[onclick="simpanSesiUjian()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳...'; btnSimpan.disabled = true; }

        const payload = { nama: nama.toUpperCase(), waktu: waktu || '' };

        if (idSesi) await updateDoc(doc(db, 'master_sesi_ujian', idSesi), payload);
        else await addDoc(collection(db, 'master_sesi_ujian'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }
        window.closeModal('modalSesiUjian');
        if (typeof window.loadSesiUjian === 'function') window.loadSesiUjian();
    } catch (error) {
        console.error("Gagal menyimpan Sesi Ujian:", error);
    }
};

window.hapusSesiUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Sesi Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_sesi_ujian', id));
            loadSesiUjian();
        } catch(e) { console.error(e); }
    }
};

// --- RUANG UJIAN ---
window.loadRuangUjian = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_ruang_ujian'));
        state.masterRuangUjian = [];
        snap.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));

        if(state.masterRuangUjian.length === 0) {
            const defaultRuang = [
                { nama: 'Ruang 1', kode: 'R1', jumSesi: 2, noUrut: 1 },
                { nama: 'Ruang 2', kode: 'R2', jumSesi: 2, noUrut: 2 }
            ];
            for (const r of defaultRuang) {
                const docRef = await addDoc(collection(db, 'master_ruang_ujian'), r);
                state.masterRuangUjian.push({ id: docRef.id, ...r });
            }
        }
        state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        window.renderTableRuangUjian();
    } catch(e) { console.error("Error load ruang ujian:", e); }
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

window.openModalRuangUjian = (id = '', nama = '', kode = '') => {
    const elId = document.getElementById('ruangUjianId');
    const elNama = document.getElementById('inputNamaRuang');
    const elKode = document.getElementById('inputKodeRuang');
    const modal = document.getElementById('modalRuangUjian');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elKode) elKode.value = kode;
    if (modal) modal.classList.remove('hidden');
};

window.editRuangUjian = (id) => {
    const ruang = state.masterRuangUjian ? state.masterRuangUjian.find(r => r.id === id) : null;
    if (ruang) window.openModalRuangUjian(ruang.id, ruang.nama, ruang.kode);
};

window.simpanRuangUjian = async () => {
    try {
        const idRuang = document.getElementById('ruangUjianId')?.value || '';
        const nama = document.getElementById('inputNamaRuang')?.value.trim();
        const kode = document.getElementById('inputKodeRuang')?.value.trim();

        if (!nama) return alert('Gagal: Nama Ruang wajib diisi!');

        const btnSimpan = document.querySelector('#modalRuangUjian button[onclick="simpanRuangUjian()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳...'; btnSimpan.disabled = true; }

        const payload = { nama: nama.toUpperCase(), kode: (kode || '').toUpperCase() };

        if (idRuang) await updateDoc(doc(db, 'master_ruang_ujian', idRuang), payload);
        else await addDoc(collection(db, 'master_ruang_ujian'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }
        window.closeModal('modalRuangUjian');
        if (typeof window.loadRuangUjian === 'function') window.loadRuangUjian();
    } catch (error) {
        console.error("Gagal menyimpan Ruang Ujian:", error);
    }
};

window.hapusRuangUjian = async (id) => {
    if(confirm("Yakin ingin menghapus Ruang Ujian ini?")) {
        try {
            await deleteDoc(doc(db, 'master_ruang_ujian', id));
            loadRuangUjian();
        } catch(e) { console.error(e); }
    }
};

// --- ATUR RUANG & SESI SISWA ---
window.loadAturRuangSesi = async () => {
    const tb = document.getElementById('tableAturRuangSesiBody');
    const filterKelas = document.getElementById('filterKelasAtur');
    const bulkRuang = document.getElementById('bulkRuang');
    const bulkSesi = document.getElementById('bulkSesi');

    if (!tb || !filterKelas || !bulkRuang || !bulkSesi) return;
    tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Memuat data...</td></tr>';

    try {
        if (!state.masterKelas || state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        if (!state.masterRuangUjian || state.masterRuangUjian.length === 0) {
            const snapRuang = await getDocs(collection(db, 'master_ruang_ujian'));
            state.masterRuangUjian = [];
            snapRuang.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));
            state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        if (!state.masterSesiUjian || state.masterSesiUjian.length === 0) {
            const snapSesi = await getDocs(collection(db, 'master_sesi_ujian'));
            state.masterSesiUjian = [];
            snapSesi.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));
            state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
        }

        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        filterKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>';
        state.masterKelas.forEach(k => { filterKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; });

        bulkRuang.innerHTML = '<option value="">Pilih ruang</option>';
        state.masterRuangUjian.forEach(r => { bulkRuang.innerHTML += `<option value="${r.nama}">${r.nama}</option>`; });

        bulkSesi.innerHTML = '<option value="">Pilih sesi</option>';
        state.masterSesiUjian.forEach(s => { bulkSesi.innerHTML += `<option value="${s.nama}">${s.nama}</option>`; });

        if(state.masterKelas.length > 0 && !filterKelas.value) filterKelas.value = state.masterKelas[0].nama;
        window.renderTableAturRuangSesi();
    } catch(e) {
        console.error("Error load atur ruang sesi:", e);
    }
};

window.renderTableAturRuangSesi = () => {
    const elFilter = document.getElementById('filterKelasAtur');
    const tb = document.getElementById('tableAturRuangSesiBody');
    const lbl = document.getElementById('labelBulkAction');
    
    if (!tb || !elFilter) return;

    const kelasVal = elFilter.value;
    tb.innerHTML = '';

    if (lbl) lbl.innerText = `Gabungkan siswa ${kelasVal ? kelasVal : ''} ke ruang dan sesi:`;
    
    if (!kelasVal) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Silakan pilih kelas terlebih dahulu.</td></tr>';
        return;
    }

    const filteredSiswa = (state.masterSiswa || [])
        .filter(s => s.kelas === kelasVal)
        .sort((a,b) => (a.nama||'').localeCompare(b.nama||''));
    
    if (filteredSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Tidak ada siswa terdaftar di kelas ini.</td></tr>';
        return;
    }

    let optRuang = '<option value="">Pilih ruang</option>';
    (state.masterRuangUjian || []).forEach(r => { optRuang += `<option value="${r.nama}">${r.nama}</option>`; });
    
    let optSesi = '<option value="">Pilih sesi</option>';
    (state.masterSesiUjian || []).forEach(s => { optSesi += `<option value="${s.nama}">${s.nama}</option>`; });

    filteredSiswa.forEach((s, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-blue-50 transition border-b border-slate-100" data-id="${s.id}">
                <td class="p-3 text-center border-r text-slate-500 font-bold">${i+1}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800">${s.nama}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">${s.kelas}</td>
                <td class="p-2 border-r bg-slate-50">
                    <select class="w-full p-2 border border-slate-300 rounded outline-none select-ruang text-sm bg-white focus:border-blue-500">${optRuang}</select>
                </td>
                <td class="p-2 border-r bg-slate-50">
                    <select class="w-full p-2 border border-slate-300 rounded outline-none select-sesi text-sm bg-white focus:border-blue-500">${optSesi}</select>
                </td>
            </tr>
        `;
    });

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

window.terapkanAturMassal = () => {
    const valRuang = document.getElementById('bulkRuang')?.value;
    const valSesi = document.getElementById('bulkSesi')?.value;

    if (!valRuang && !valSesi) return alert("Pilih Ruang atau Sesi terlebih dahulu untuk diterapkan secara massal.");

    const rows = document.querySelectorAll('#tableAturRuangSesiBody tr');
    let count = 0;

    rows.forEach(row => {
        const selects = row.querySelectorAll('select');
        if (selects.length >= 2) {
            if (valRuang) selects[0].value = valRuang;
            if (valSesi) selects[1].value = valSesi;
            count++;
        }
    });

    if (count > 0) alert(`Berhasil menerapkan pilihan ke ${count} siswa di layar. Jangan lupa klik tombol "💾 Simpan Perubahan"!`);
};

window.generateRuangSesiOtomatis = () => {
    const rows = document.querySelectorAll('#tableAturRuangSesiBody tr');
    if (rows.length === 0) return alert("Belum ada data siswa di tabel.");

    const firstRowSelects = rows[0].querySelectorAll('select');
    if (firstRowSelects.length < 2) return;

    const opsiRuang = Array.from(firstRowSelects[0].options).map(opt => opt.value).filter(val => val !== "");
    const opsiSesi = Array.from(firstRowSelects[1].options).map(opt => opt.value).filter(val => val !== "");

    if (opsiRuang.length === 0 || opsiSesi.length === 0) return alert("Data Master Ruang atau Sesi masih kosong!");

    let ruangIndex = 0;
    let sesiIndex = 0;
    const kapasitasPerRuang = 20; 

    rows.forEach((row, index) => {
        const selects = row.querySelectorAll('select');
        if (selects.length >= 2) {
            selects[0].value = opsiRuang[ruangIndex];
            selects[1].value = opsiSesi[sesiIndex];

            if ((index + 1) % kapasitasPerRuang === 0) {
                ruangIndex++;
                if (ruangIndex >= opsiRuang.length) {
                    ruangIndex = 0;
                    sesiIndex++;
                    if (sesiIndex >= opsiSesi.length) sesiIndex = 0; 
                }
            }
        }
    });
    alert("✨ Siswa berhasil didistribusikan secara otomatis (Asumsi max. 20 anak per ruangan). Jangan lupa klik '💾 Simpan Perubahan'!");
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
            
            const s = state.masterSiswa.find(x => x.id === id);
            if(s) { s.ruang = ruang; s.sesi = sesi; }
            
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

// --- PENGAWAS UJIAN ---
window.loadPengawas = async () => {
    const tb = document.getElementById('tablePengawasBody');
    if (!tb) return;
    tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">⏳ Memuat data pengawas...</td></tr>';
    try {
        const snap = await getDocs(collection(db, 'master_pengawas'));
        state.masterPengawas = [];
        snap.forEach(d => state.masterPengawas.push({id: d.id, ...d.data()}));
        state.masterPengawas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        if (typeof window.renderTablePengawas === 'function') window.renderTablePengawas();
    } catch(e) { console.error("Error load pengawas:", e); }
};

window.renderTablePengawas = () => {
    const tb = document.getElementById('tablePengawasBody');
    if (!tb) return;
    tb.innerHTML = '';
    if (!state.masterPengawas || state.masterPengawas.length === 0) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada data Pengawas. Silakan klik Tambah Pengawas.</td></tr>';
        return;
    }
    state.masterPengawas.forEach((p, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i + 1}</td>
                <td class="p-3 border-r font-bold uppercase text-slate-800">${p.nama || '-'}</td>
                <td class="p-3 text-center border-r font-mono text-slate-600">${p.nip || '-'}</td>
                <td class="p-3 text-center border-r text-slate-600">${p.username || '-'}</td>
                <td class="p-3 text-center border-r font-mono text-slate-400 text-lg tracking-widest">••••••</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="editPengawas('${p.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusPengawas('${p.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalPengawas = (id = '', nama = '', nip = '', user = '', pass = '') => {
    const elId = document.getElementById('pengawasId');
    const elNama = document.getElementById('inputNamaPengawas');
    const elNip = document.getElementById('inputNipPengawas');
    const elUser = document.getElementById('inputUserPengawas');
    const elPass = document.getElementById('inputPassPengawas');
    const modal = document.getElementById('modalPengawas');

    if (elId) elId.value = id;
    if (elNama) elNama.value = nama;
    if (elNip) elNip.value = nip;
    if (elUser) elUser.value = user;
    if (elPass) elPass.value = pass;
    if (modal) modal.classList.remove('hidden');
};

window.editPengawas = (id) => {
    const pengawas = state.masterPengawas ? state.masterPengawas.find(p => p.id === id) : null;
    if (pengawas) window.openModalPengawas(pengawas.id, pengawas.nama, pengawas.nip, pengawas.username, pengawas.password);
};

window.simpanPengawas = async () => {
    try {
        const idPengawas = document.getElementById('pengawasId')?.value || '';
        const nama = document.getElementById('inputNamaPengawas')?.value.trim();
        const nip = document.getElementById('inputNipPengawas')?.value.trim();
        const user = document.getElementById('inputUserPengawas')?.value.trim();
        const pass = document.getElementById('inputPassPengawas')?.value;

        if (!nama) return alert('Gagal: Nama Pengawas wajib diisi!');

        const btnSimpan = document.querySelector('#modalPengawas button[onclick="simpanPengawas()"]');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳...'; btnSimpan.disabled = true; }

        const payload = {
            nama: nama.toUpperCase(),
            nip: (nip || '').toUpperCase(),
            username: (user || '').toLowerCase(),
            password: pass || ''
        };

        if (idPengawas) await updateDoc(doc(db, 'master_pengawas', idPengawas), payload);
        else await addDoc(collection(db, 'master_pengawas'), payload);

        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan'; btnSimpan.disabled = false; }
        window.closeModal('modalPengawas');
        if (typeof window.loadPengawas === 'function') window.loadPengawas();
    } catch (error) {
        console.error("Gagal menyimpan Pengawas:", error);
    }
};

window.hapusPengawas = async (id) => {
    if(confirm("Yakin ingin menghapus data pengawas ini?")) {
        try {
            await deleteDoc(doc(db, 'master_pengawas', id));
            loadPengawas();
        } catch(e) { console.error(e); }
    }
};


// ============================================================================
// 5. NOMOR PESERTA & TOKEN UJIAN
// ============================================================================
window.loadNomorPeserta = async () => {
    try {
        if (state.masterKelas.length === 0) {
            const snapKelas = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            snapKelas.forEach(d => state.masterKelas.push({ id: d.id, ...d.data() }));
            state.masterKelas.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));
        }

        if (state.masterSiswa.length === 0) {
            const snapSiswa = await getDocs(collection(db, 'master_siswa'));
            state.masterSiswa = [];
            snapSiswa.forEach(d => state.masterSiswa.push({ id: d.id, ...d.data() }));
        }

        const selectKelas = document.getElementById('selectKelasNomor');
        if (selectKelas) {
            selectKelas.innerHTML = '<option value="ALL">Semua Kelas</option>';
            state.masterKelas.forEach(k => { selectKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; });
        }
        
        window.renderNomorPeserta();
    } catch (e) { console.error("Error load nomor peserta:", e); }
};

window.renderNomorPeserta = () => {
    const tb = document.getElementById('tableNomorPesertaBody');
    if (!tb) return;
    tb.innerHTML = '';
    
    if (!state.masterSiswa || state.masterSiswa.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada data siswa.</td></tr>';
        return;
    }
    
    // Filter by class logic could be added here if needed, for now renders all or based on filter
    state.masterSiswa.forEach((s, i) => {
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100" data-id="${s.id}">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i + 1}</td>
                <td class="p-3 border-r font-bold text-slate-800 uppercase">${s.nama || '-'}</td>
                <td class="p-3 text-center border-r font-bold text-slate-600">${s.kelas || '-'}</td>
                <td class="p-3 border-r">
                    <input type="text" class="input-nomor w-full p-2 border border-slate-300 rounded outline-none font-mono focus:border-blue-500 uppercase tracking-widest text-center" value="${s.nomor_peserta || s.noUjian || s.nis || ''}" placeholder="Ketik nomor...">
                </td>
                <td class="p-3 text-center">
                    <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tersimpan</span>
                </td>
            </tr>
        `;
    });
};

window.generateNomorPeserta = async () => {
    const kelasVal = document.getElementById('selectKelasNomor') ? document.getElementById('selectKelasNomor').value : 'ALL';
    const btn = document.getElementById('btnGenerateNomor');
    const NPSN_SEKOLAH = '20528347'; // Sesuaikan NPSN

    let siswaTarget = [];
    if (kelasVal === 'ALL') {
        siswaTarget = [...state.masterSiswa];
    } else {
        siswaTarget = state.masterSiswa.filter(s => s.kelas === kelasVal);
    }

    if (siswaTarget.length === 0) return alert("Tidak ada data siswa untuk digenerate!");

    siswaTarget.sort((a, b) => {
        if (a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
        return (a.kelas || '').localeCompare(b.kelas || '');
    });

    if (!confirm(`Sistem akan men-generate ulang nomor ujian untuk ${siswaTarget.length} siswa. Lanjutkan?`)) return;

    if (btn) { btn.disabled = true; btn.innerHTML = "Memproses..."; }

    try {
        const promises = [];
        siswaTarget.forEach((s, index) => {
            const noUrut = String(index + 1).padStart(3, '0');
            const noUjianBaru = `${NPSN_SEKOLAH}-${noUrut}`;
            promises.push(updateDoc(doc(db, 'master_siswa', s.id), { 
                nis: noUjianBaru,
                noUjian: noUjianBaru,
                nomor_peserta: noUjianBaru
            }));
        });

        await Promise.all(promises);
        alert("Nomor Peserta berhasil di-generate dan disimpan!");
        await loadNomorPeserta(); 
    } catch (e) {
        console.error("Gagal generate nomor:", e);
        alert("Terjadi kesalahan saat memperbarui database.");
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = "✨ Generate Otomatis"; }
    }
};

window.simpanNomorPeserta = async () => {
    const rows = document.querySelectorAll('#tableNomorPesertaBody tr[data-id]');
    let count = 0;
    let promises = [];

    const btnSimpan = document.querySelector('button[onclick="simpanNomorPeserta()"]');
    if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

    try {
        rows.forEach(row => {
            const idSiswa = row.getAttribute('data-id');
            const input = row.querySelector('.input-nomor');
            if (idSiswa && input && input.value.trim() !== '') {
                promises.push(updateDoc(doc(db, 'master_siswa', idSiswa), { 
                    nomor_peserta: input.value.trim().toUpperCase(),
                    noUjian: input.value.trim().toUpperCase(),
                    nis: input.value.trim().toUpperCase() // Sinkronisasi dengan NIS untuk login
                }));
                count++;
            }
        });

        await Promise.all(promises);
        alert(`✅ Berhasil menyimpan ${count} nomor peserta ke database!`);
    } catch (error) {
        console.error("Gagal simpan:", error);
    } finally {
        if (btnSimpan) { btnSimpan.innerHTML = '💾 Simpan Perubahan'; btnSimpan.disabled = false; }
    }
};

// --- TOKEN UJIAN ---
window.loadToken = async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'token_ujian'));
        if(snap.exists()) {
            state.tokenConfig = snap.data();
        } else {
            state.tokenConfig = { currentToken: '------', isAuto: false, interval: 60 };
            await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig);
        }
        window.renderTokenUI();
    } catch(e) { console.error("Error load token:", e); }
};

window.renderTokenUI = () => {
    if (!document.getElementById('settingTokenOtomatis')) return;
    document.getElementById('settingTokenOtomatis').value = state.tokenConfig.isAuto ? 'YA' : 'TIDAK';
    document.getElementById('settingTokenInterval').value = state.tokenConfig.interval || 60;
    document.getElementById('displayTokenAktif').innerText = state.tokenConfig.currentToken || '------';
};

window.generateToken = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newToken = '';
    for (let i = 0; i < 6; i++) {
        newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    try {
        if(!state.tokenConfig) state.tokenConfig = {};
        state.tokenConfig.currentToken = newToken;
        await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig, { merge: true });
        window.renderTokenUI();
        alert(`Token ujian berhasil diperbarui: ${newToken}\nSilakan berikan token ini kepada siswa.`);
        if(typeof loadDashboard === 'function') loadDashboard();
    } catch(e) {
        console.error("Gagal generate token:", e);
    }
};

window.simpanPengaturanToken = async () => {
    const isAuto = document.getElementById('settingTokenOtomatis')?.value === 'YA';
    const interval = parseInt(document.getElementById('settingTokenInterval')?.value) || 60;
    
    try {
        if(!state.tokenConfig) state.tokenConfig = {};
        state.tokenConfig.isAuto = isAuto;
        state.tokenConfig.interval = interval;
        await setDoc(doc(db, 'settings', 'token_ujian'), state.tokenConfig, { merge: true });
        alert(`Pengaturan Token Berhasil Disimpan!\nStatus Otomatis: ${isAuto ? 'YA' : 'TIDAK'}\nInterval: ${interval} Menit`);
    } catch(e) { console.error("Gagal simpan setting token", e); }
};


// ============================================================================
// 6. BANK SOAL & EDITOR BUTIR SOAL
// ============================================================================
window.loadBankSoal = async () => {
    try {
        if (typeof state === 'undefined') window.state = {};
        state.masterSoal = []; 

        const snap = await getDocs(collection(db, 'master_bank_soal')); // Asumsi nama koleksi disamakan
        snap.forEach(d => { state.masterSoal.push({ id: d.id, ...d.data() }); });

        if (typeof window.renderTableBankSoal === 'function') window.renderTableBankSoal();
    } catch (e) {
        console.error("Error load bank soal:", e);
    }
};

window.renderTableBankSoal = () => {
    const tb = document.getElementById('tableBankSoalBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!state.masterSoal || state.masterSoal.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Bank Soal. Silakan buat baru.</td></tr>';
        return;
    }

    state.masterSoal.forEach((b, i) => {
        const statusColor = b.isActive !== false ? "bg-amber-400" : "bg-slate-400";
        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-l-4 ${b.isActive !== false ? 'border-l-amber-400' : 'border-l-slate-400'} border-b border-slate-100">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 ${statusColor} rounded-full"></div>
                        <span class="font-bold text-blue-700 font-mono tracking-tight">${b.kode || b.mapel || '-'}</span>
                    </div>
                </td>
                <td class="p-3 border-r font-bold text-slate-800">${b.mapel || '-'}</td>
                <td class="p-3 border-r text-center font-bold text-slate-600">${b.kelas || '-'}</td>
                <td class="p-3 border-r text-center font-black text-slate-700">${b.totalSoal || 0}</td>
                <td class="p-3 text-center space-x-1 whitespace-nowrap">
                    <button onclick="bukaSoalDetail('${b.id}', '${b.mapel}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded shadow-sm text-xs font-bold transition">📝 Soal</button>
                    <button onclick="editBankSoal('${b.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-2 py-1 rounded shadow-sm text-xs font-bold transition">✏️ Edit</button>
                    <button onclick="hapusBankSoal('${b.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm text-xs transition">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.openModalBankSoal = () => {
    document.getElementById('bankSoalId').value = '';
    document.getElementById('bsKode').value = '';
    document.getElementById('bsMapel').value = '';
    document.getElementById('bsKelas').value = '';
    document.getElementById('bsLevel').value = '1';
    ['Pg','Pgk','Bs','Isian','Uraian','Urut'].forEach(k => {
        if(document.getElementById(`bs${k}Jml`)) document.getElementById(`bs${k}Jml`).value = 0;
        if(document.getElementById(`bs${k}Bobot`)) document.getElementById(`bs${k}Bobot`).value = 0;
    });
    if(document.getElementById('bsStatus')) document.getElementById('bsStatus').value = 'true';
    if(typeof window.kalkulasiTotalSoalBobot === 'function') window.kalkulasiTotalSoalBobot();
    document.getElementById('modalBankSoal').classList.remove('hidden');
};

window.simpanBankSoal = async () => {
    const id = document.getElementById('bankSoalId').value;
    const kode = document.getElementById('bsKode')?.value.trim().toUpperCase();
    const mapel = document.getElementById('bsMapel')?.value;
    const kelas = document.getElementById('bsKelas')?.value;

    if(!kode || !mapel || !kelas) return alert("Kode, Mapel, dan Kelas wajib diisi!");

    const getVal = (idx) => parseInt(document.getElementById(idx)?.value) || 0;
    const totalSoal = getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml');
    const totalBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');

    if(totalBobot !== 100 && totalBobot !== 0) {
        if(!confirm("Peringatan: Total bobot tidak 100%. Lanjutkan?")) return;
    }

    const data = {
        kode, mapel, kelas, totalSoal,
        guru: document.getElementById('bsGuru')?.value || '',
        level: document.getElementById('bsLevel')?.value || '1',
        isActive: document.getElementById('bsStatus')?.value === 'true',
        kategoriAgama: document.getElementById('bsKategori')?.value || '',
        komposisi: {
            pg: { jml: getVal('bsPgJml'), bobot: getVal('bsPgBobot'), opsi: document.getElementById('bsPgOpsi')?.value || '4' },
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
    } catch(e) { console.error(e); } finally {
        if(btn) { btn.disabled = false; btn.innerText = "Simpan Bank Soal"; }
    }
};

window.editBankSoal = (id) => {
    const b = state.masterSoal.find(x => x.id === id);
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
            if(document.getElementById(`bs${field}Jml`)) document.getElementById(`bs${field}Jml`).value = b.komposisi[k]?.jml || 0;
            if(document.getElementById(`bs${field}Bobot`)) document.getElementById(`bs${field}Bobot`).value = b.komposisi[k]?.bobot || 0;
        });
        if(document.getElementById('bsPgOpsi')) document.getElementById('bsPgOpsi').value = b.komposisi.pg?.opsi || '4';
    }
    
    if(document.getElementById('bsKategori')) document.getElementById('bsKategori').value = b.kategoriAgama || 'Bukan Mapel Agama';
    if(document.getElementById('bsStatus')) document.getElementById('bsStatus').value = b.isActive !== false ? 'true' : 'false';
    if(typeof window.kalkulasiTotalSoalBobot === 'function') window.kalkulasiTotalSoalBobot();
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

window.kalkulasiTotalSoalBobot = () => {
    const getVal = (id) => parseInt(document.getElementById(id)?.value) || 0;
    const tSoal = getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml');
    const tBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');
    
    if(document.getElementById('bsLabelTotalSoal')) document.getElementById('bsLabelTotalSoal').innerText = tSoal;
    const lblBobot = document.getElementById('bsLabelTotalBobot');
    if(lblBobot) {
        lblBobot.innerText = tBobot + "%";
        if(tBobot !== 100 && tBobot !== 0) lblBobot.classList.replace('text-slate-800', 'text-red-600');
        else lblBobot.classList.replace('text-red-600', 'text-slate-800');
    }
};

// --- EDITOR BUTIR SOAL ---
window.bukaSoalDetail = window.bukaEditorSoal = async (bankSoalId, namaMapel = '') => {
    window.switchTab('viewEditorSoal', 'Editor Soal');
    const header = document.getElementById('headerEditorSoal');
    if (header) header.innerText = `Editor Soal: ${namaMapel || 'Mata Pelajaran'}`;

    if (typeof window.state === 'undefined') window.state = {};
    window.state.currentBankSoalId = bankSoalId;
    window.state.butirSoalAktif = []; 
    
    // Tarik soal dari firebase subcollection
    try {
        const snap = await getDocs(collection(db, `master_bank_soal/${bankSoalId}/butir_soal`));
        snap.forEach(d => window.state.butirSoalAktif.push({ id: d.id, ...d.data() }));
        window.state.butirSoalAktif.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0));
    } catch(e) { console.error("Gagal menarik butir soal:", e); }
    
    window.renderDaftarButirSoal();
    window.tambahButirSoalBaru();
};

window.renderDaftarButirSoal = () => {
    const container = document.getElementById('listButirSoal');
    if (!container) return;
    container.innerHTML = ''; 

    if (!window.state.butirSoalAktif || window.state.butirSoalAktif.length === 0) {
        container.innerHTML = '<span class="text-xs text-slate-400 italic w-full text-center mt-4 border-t pt-4">Belum ada soal.</span>';
        return;
    }

    window.state.butirSoalAktif.forEach((soal, index) => {
        const isActive = window.state.sedangEditId === soal.id;
        container.innerHTML += `
            <button type="button" onclick="bukaEditButirSoal('${soal.id}')" 
                class="w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm transition shadow-sm border
                ${isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-300 hover:bg-blue-50'}">
                ${index + 1}
            </button>
        `;
    });
};

window.tambahButirSoalBaru = () => {
    const panel = document.getElementById('panelFormSoal');
    if (panel) panel.classList.remove('hidden');

    const listInput = ['editorPertanyaan', 'opsiA', 'opsiB', 'opsiC', 'opsiD', 'editorKunci'];
    listInput.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const elTipe = document.getElementById('editorTipeSoal');
    if (elTipe) elTipe.value = 'PG';

    window.state.sedangEditId = null; 

    const btnSimpan = document.getElementById('btnSimpanButir');
    if (btnSimpan) {
        btnSimpan.innerHTML = '💾 Simpan Soal';
        btnSimpan.disabled = false;
    }

    const labelNo = document.getElementById('labelNomorSoal');
    if (window.state.butirSoalAktif) {
        if (labelNo) labelNo.innerText = `Soal Baru (Nomor ${window.state.butirSoalAktif.length + 1})`;
    }

    const preview = document.getElementById('previewSoalContainer');
    if (preview) preview.innerHTML = '';
    
    window.renderDaftarButirSoal(); // Refresh highlight
};

window.simpanButirSoal = async () => {
    try {
        const pertanyaan = document.getElementById('editorPertanyaan')?.value || '';
        const tipe = document.getElementById('editorTipeSoal')?.value || 'PG';
        const opsiA = document.getElementById('opsiA')?.value || '';
        const opsiB = document.getElementById('opsiB')?.value || '';
        const opsiC = document.getElementById('opsiC')?.value || '';
        const opsiD = document.getElementById('opsiD')?.value || '';
        const kunci = document.getElementById('editorKunci')?.value || '';

        if (!pertanyaan.trim()) return alert('Gagal: Kolom Pertanyaan masih kosong!');

        const btnSimpan = document.getElementById('btnSimpanButir');
        if (btnSimpan) { btnSimpan.innerHTML = '⏳ Menyimpan...'; btnSimpan.disabled = true; }

        const payload = {
            pertanyaan: pertanyaan,
            tipe: tipe,
            opsi: { A: opsiA, B: opsiB, C: opsiC, D: opsiD }, // Disimpan dalam object opsi agar rapi
            kunci: kunci.toUpperCase().trim()
        };

        const bankId = window.state.currentBankSoalId;
        if (!bankId) throw new Error("ID Bank Soal tidak ditemukan.");

        if (window.state.sedangEditId) {
            await updateDoc(doc(db, `master_bank_soal/${bankId}/butir_soal`, window.state.sedangEditId), payload);
            const index = window.state.butirSoalAktif.findIndex(s => s.id === window.state.sedangEditId);
            if (index !== -1) window.state.butirSoalAktif[index] = { id: window.state.sedangEditId, ...payload };
            alert("✅ Butir soal berhasil di-update!");
        } else {
            payload.noUrut = window.state.butirSoalAktif.length + 1;
            const docRef = await addDoc(collection(db, `master_bank_soal/${bankId}/butir_soal`), payload);
            window.state.butirSoalAktif.push({ id: docRef.id, ...payload });
            alert("✅ Butir soal baru berhasil disimpan!");
        }

        window.renderDaftarButirSoal();
        window.tambahButirSoalBaru();

    } catch (error) {
        console.error("Gagal simpan:", error);
        alert("Terjadi kesalahan: " + error.message);
        const btnSimpan = document.getElementById('btnSimpanButir');
        if (btnSimpan) { btnSimpan.innerHTML = 'Simpan Soal'; btnSimpan.disabled = false; }
    }
};

window.bukaEditButirSoal = window.editButirSoal = (idSoal) => {
    const soal = window.state.butirSoalAktif.find(s => s.id === idSoal);
    if (!soal) return alert("Data soal tidak ditemukan!");

    window.state.sedangEditId = idSoal;

    if (document.getElementById('editorPertanyaan')) document.getElementById('editorPertanyaan').value = soal.pertanyaan || '';
    if (document.getElementById('editorTipeSoal')) document.getElementById('editorTipeSoal').value = soal.tipe || 'PG';
    
    // Tarik nilai opsi jika tersimpan dalam object 'opsi' atau terpisah (backward compatibility)
    if (document.getElementById('opsiA')) document.getElementById('opsiA').value = soal.opsi?.A || soal.opsiA || '';
    if (document.getElementById('opsiB')) document.getElementById('opsiB').value = soal.opsi?.B || soal.opsiB || '';
    if (document.getElementById('opsiC')) document.getElementById('opsiC').value = soal.opsi?.C || soal.opsiC || '';
    if (document.getElementById('opsiD')) document.getElementById('opsiD').value = soal.opsi?.D || soal.opsiD || '';
    if (document.getElementById('editorKunci')) document.getElementById('editorKunci').value = soal.kunci || '';

    const indexSoal = window.state.butirSoalAktif.findIndex(s => s.id === idSoal);
    const labelNo = document.getElementById('labelNomorSoal');
    if (labelNo) labelNo.innerText = `Edit Soal Nomor ${indexSoal + 1}`;

    const btnSimpan = document.getElementById('btnSimpanButir');
    if (btnSimpan) btnSimpan.innerHTML = '💾 Update Soal';
    
    window.renderDaftarButirSoal(); // Refresh highlight
    if(typeof updatePreviewSoal === 'function') updatePreviewSoal();
};

window.hapusButirSoal = async () => {
    if(!window.state.sedangEditId) return alert("Pilih soal yang akan dihapus terlebih dahulu.");
    if(confirm("Hapus butir soal ini?")) {
        try {
            await deleteDoc(doc(db, `master_bank_soal/${window.state.currentBankSoalId}/butir_soal`, window.state.sedangEditId));
            window.state.butirSoalAktif = window.state.butirSoalAktif.filter(s => s.id !== window.state.sedangEditId);
            window.tambahButirSoalBaru();
        } catch(e) { console.error(e); }
    }
};

window.updatePreviewSoal = () => {
    const container = document.getElementById('previewSoalContainer');
    if (!container) return;
    const teks = document.getElementById('editorPertanyaan').value;
    container.innerHTML = teks;
    if (window.MathJax) {
        MathJax.typesetPromise([container]).catch(err => console.error("MathJax error:", err));
    }
};

window.sisipkanGambar = (targetTextareaId) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; 
                let width = img.width;
                let height = img.height;
                if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const base64String = canvas.toDataURL('image/jpeg', 0.7);
                const imgTag = `\n<img src="${base64String}" style="max-width:100%; height:auto; margin-top:8px; border-radius:8px;" alt="gambar-soal">\n`;
                const textarea = document.getElementById(targetTextareaId);
                const cursorPos = textarea.selectionStart;
                const textBefore = textarea.value.substring(0, cursorPos);
                const textAfter = textarea.value.substring(cursorPos);
                textarea.value = textBefore + imgTag + textAfter;
                textarea.focus();
                if(targetTextareaId === 'editorPertanyaan') window.updatePreviewSoal();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click(); 
};


// ============================================================================
// 7. JADWAL, ALOKASI & STATUS UJIAN (RADAR)
// ============================================================================

// --- JADWAL UJIAN ---
window.loadJadwalUjian = async () => {
    try {
        if (state.masterSubjects?.length === 0 || !state.masterSubjects) {
            const s1 = await getDocs(collection(db, 'master_mapel')); // Menggunakan master_mapel
            state.masterSubjects = [];
            s1.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()}));
        }
        if (state.masterJenisUjian?.length === 0 || !state.masterJenisUjian) {
            const s2 = await getDocs(collection(db, 'master_jenis_ujian'));
            state.masterJenisUjian = [];
            s2.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()}));
        }
        if (state.masterSoal?.length === 0 || !state.masterSoal) { // Menyesuaikan dengan state bank soal baru
            const s3 = await getDocs(collection(db, 'master_bank_soal'));
            state.masterSoal = [];
            s3.forEach(d => state.masterSoal.push({id: d.id, ...d.data()}));
        }

        const selMapel = document.getElementById('juMapel');
        if(selMapel) {
            selMapel.innerHTML = '<option value="">-- Pilih Mata Pelajaran --</option>';
            state.masterSubjects.forEach(m => selMapel.innerHTML += `<option value="${m.nama}">${m.nama}</option>`);
        }

        const selJenis = document.getElementById('juJenis');
        if(selJenis) {
            selJenis.innerHTML = '<option value="">-- Pilih Jenis Penilaian --</option>';
            state.masterJenisUjian.forEach(j => selJenis.innerHTML += `<option value="${j.nama}">${j.nama}</option>`);
        }

        const snap = await getDocs(collection(db, 'master_jadwal_ujian'));
        state.masterJadwalUjian = [];
        snap.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        
        window.renderTableJadwalUjian();
    } catch(e) { console.error("Error load jadwal:", e); }
};

window.filterBankSoalByMapel = () => {
    const mapelTerpilih = document.getElementById('juMapel').value;
    const selBank = document.getElementById('juBankSoal');
    selBank.innerHTML = '<option value="">-- Pilih Bank Soal --</option>';
    if(!mapelTerpilih) return;
    const bankFiltered = state.masterSoal.filter(b => b.mapel === mapelTerpilih && b.isActive !== false);
    if(bankFiltered.length === 0) {
        selBank.innerHTML = '<option value="">Belum ada Bank Soal Aktif untuk mapel ini</option>';
        return;
    }
    bankFiltered.forEach(b => {
        selBank.innerHTML += `<option value="${b.id}">${b.kode || b.mapel} - (Kls ${b.kelas}) - ${b.totalSoal || 0} Soal</option>`;
    });
};

window.renderTableJadwalUjian = () => {
    const tb = document.getElementById('tableJadwalUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!state.masterJadwalUjian || state.masterJadwalUjian.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Jadwal Ujian. Silakan klik + Tambah Jadwal.</td></tr>';
        return;
    }

    state.masterJadwalUjian.forEach((j, i) => {
        const bs = state.masterSoal.find(x => x.id === j.bankSoalId);
        const bsLabel = bs ? `${bs.kode || bs.mapel} (Kls ${bs.kelas})` : '<span class="text-red-500 italic">Bank Soal Hilang</span>';
        
        let statusBadge = `<span class="bg-pink-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Belum dimulai</span>`;
        if(j.isActive === false) statusBadge = `<span class="bg-slate-500 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Tidak aktif</span>`;

        const tglMulai = j.tglMulai ? new Date(j.tglMulai).toLocaleString('id-ID', {day:'numeric', month:'short', hour:'2-digit', minute:'2-digit'}) : '-';

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-l-4 ${j.isActive !== false ? 'border-l-blue-500' : 'border-l-slate-400'} border-b border-slate-100">
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
    
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000;
    const localNow = (new Date(now - tzOffset)).toISOString().slice(0, 16);
    const tomorrow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const localTom = (new Date(tomorrow - tzOffset)).toISOString().slice(0, 16);

    document.getElementById('juTglMulai').value = localNow;
    document.getElementById('juTglExpired').value = localTom;
    document.getElementById('juDurasi').value = '90';
    document.getElementById('juDurasiMin').value = '30';
    
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

    if(!mapel || !bankSoalId || !tglMulai || !tglExpired) return alert("Mata Pelajaran, Bank Soal, dan Rentang Waktu wajib diisi!");

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
    } catch(e) { console.error(e); } finally {
        if(btn) { btn.disabled = false; btn.innerText = "✔️ Simpan"; }
    }
};

window.editJadwalUjian = (id) => {
    const j = state.masterJadwalUjian.find(x => x.id === id);
    if(!j) return;

    document.getElementById('jadwalUjianId').value = j.id;
    document.getElementById('juMapel').value = j.mapel || '';
    window.filterBankSoalByMapel();
    
    setTimeout(() => { document.getElementById('juBankSoal').value = j.bankSoalId || ''; }, 100);

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
    if(confirm("Yakin ingin menghapus jadwal ini?")) {
        try { await deleteDoc(doc(db, 'master_jadwal_ujian', id)); loadJadwalUjian(); } 
        catch(e) { console.error(e); }
    }
};

// --- ALOKASI WAKTU ---
window.loadAlokasiWaktu = async () => {
    try {
        if (!state.masterJadwalUjian || state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({ id: d.id, ...d.data() }));
        }
        if (!state.masterSoal || state.masterSoal.length === 0) {
            const snapBank = await getDocs(collection(db, 'master_bank_soal'));
            state.masterSoal = [];
            snapBank.forEach(d => state.masterSoal.push({ id: d.id, ...d.data() }));
        }
        if (!state.masterJenisUjian || state.masterJenisUjian.length === 0) {
            const snapJenis = await getDocs(collection(db, 'master_jenis_ujian'));
            state.masterJenisUjian = [];
            snapJenis.forEach(d => state.masterJenisUjian.push({ id: d.id, ...d.data() }));
        }

        const filterJenis = document.getElementById('filterAlokasiJenis');
        if (filterJenis) {
            filterJenis.innerHTML = '<option value="">Semua Jenis</option>';
            state.masterJenisUjian.forEach(j => { filterJenis.innerHTML += `<option value="${j.nama}">${j.nama}</option>`; });
        }
        window.renderTableAlokasiWaktu();
    } catch (e) { console.error("Error load alokasi waktu:", e); }
};

window.renderTableAlokasiWaktu = () => {
    const tb = document.getElementById('tableAlokasiWaktuBody');
    if (!tb) return;
    tb.innerHTML = '';
    const filterJenisVal = document.getElementById('filterAlokasiJenis').value;
    
    let jadwalAktif = state.masterJadwalUjian.filter(j => j.isActive !== false);
    if (filterJenisVal) jadwalAktif = jadwalAktif.filter(j => j.jenis === filterJenisVal);

    if (jadwalAktif.length === 0) {
        tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada Jadwal Ujian yang Aktif.</td></tr>';
        return;
    }
    jadwalAktif.sort((a, b) => new Date(a.tglMulai) - new Date(b.tglMulai));

    jadwalAktif.forEach((j, i) => {
        const bs = state.masterSoal.find(x => x.id === j.bankSoalId);
        const kodeBS = bs ? bs.kode || bs.mapel : '-';
        const kelasBS = bs ? bs.kelas : '-';
        const jamKe = j.jamKe || 1; 

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
                    <input type="number" class="w-20 p-2 border border-slate-300 rounded text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-black text-blue-700 input-jamke" value="${jamKe}" min="0" max="10">
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
            const jLocal = state.masterJadwalUjian.find(x => x.id === idJadwal);
            if (jLocal) jLocal.jamKe = jamKeVal;
            promises.push(updateDoc(doc(db, 'master_jadwal_ujian', idJadwal), { jamKe: jamKeVal }));
        });
        await Promise.all(promises);
        alert("Alokasi urutan waktu ujian berhasil disimpan!");
    } catch (e) { console.error(e); } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = `💾 Simpan Alokasi`; }
    }
};

// --- RADAR STATUS SISWA ---
window.loadStatusSiswa = async () => {
    try {
        if (state.masterJadwalUjian.length === 0) {
            const s1 = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            s1.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }
        if (state.masterRuangUjian.length === 0) {
            const s2 = await getDocs(collection(db, 'master_ruang_ujian'));
            state.masterRuangUjian = [];
            s2.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()}));
        }
        if (state.masterSesiUjian.length === 0) {
            const s3 = await getDocs(collection(db, 'master_sesi_ujian'));
            state.masterSesiUjian = [];
            s3.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()}));
        }
        
        const s4 = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        s4.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        const snapToken = await getDoc(doc(db, 'settings', 'token_ujian'));
        if (snapToken.exists() && document.getElementById('displayTokenStatusSiswa')) {
            document.getElementById('displayTokenStatusSiswa').innerText = snapToken.data().currentToken || '------';
        }

        const selJadwal = document.getElementById('filterStatusJadwal');
        if(selJadwal) {
            selJadwal.innerHTML = '<option value="">-- Pilih Jadwal Aktif --</option>';
            state.masterJadwalUjian.filter(j => j.isActive !== false).forEach(j => {
                selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} (${j.jenis})</option>`;
            });
        }

        const selRuang = document.getElementById('filterStatusRuang');
        if(selRuang) {
            selRuang.innerHTML = '<option value="">Semua Ruang</option>';
            state.masterRuangUjian.forEach(r => { selRuang.innerHTML += `<option value="${r.nama}">${r.nama}</option>`; });
        }

        const selSesi = document.getElementById('filterStatusSesi');
        if(selSesi) {
            selSesi.innerHTML = '<option value="">Semua Sesi</option>';
            state.masterSesiUjian.forEach(s => { selSesi.innerHTML += `<option value="${s.nama}">${s.nama}</option>`; });
        }

        window.renderTableStatusSiswa();
    } catch (e) { console.error("Error load status siswa:", e); }
};

window.renderTableStatusSiswa = () => {
    const jadwalId = document.getElementById('filterStatusJadwal')?.value;
    const ruang = document.getElementById('filterStatusRuang')?.value;
    const sesi = document.getElementById('filterStatusSesi')?.value;
    const tb = document.getElementById('tableStatusSiswaBody');

    if (!tb) return;

    if (state.unsubscribeStatus) {
        state.unsubscribeStatus();
        state.unsubscribeStatus = null;
    }

    if (!jadwalId) {
        tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Pilih Jadwal Ujian terlebih dahulu.</td></tr>';
        return;
    }

    tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-blue-500 font-bold italic animate-pulse">📡 Menghubungkan ke Radar Live...</td></tr>';

    try {
        let conditions = [where('jadwal_id', '==', jadwalId)];
        if (ruang) conditions.push(where('ruang', '==', ruang)); 
        if (sesi) conditions.push(where('sesi', '==', sesi));

        const q = query(collection(db, 'cbt_sesi_siswa'), ...conditions);

        state.unsubscribeStatus = onSnapshot(q, (snapshot) => {
            tb.innerHTML = ''; 

            if (snapshot.empty) {
                tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 italic">Belum ada siswa yang login di jadwal/ruang ini.</td></tr>';
                return;
            }

            let i = 1;
            snapshot.forEach((docSnap) => {
                const s = docSnap.data();
                const sId = docSnap.id; 
                
                let statusColor = "bg-slate-500";
                let statusText = s.status || "BELUM LOGIN";
                let statusBlinking = ""; 
                
                const textLower = statusText.toLowerCase();
                if (textLower.includes('mengerjakan') || textLower.includes('aktif')) {
                    statusColor = "bg-blue-500"; statusBlinking = "animate-pulse"; 
                } else if (textLower.includes('selesai')) {
                    statusColor = "bg-emerald-500";
                } else if (textLower.includes('kunci') || textLower.includes('keluar')) {
                    statusColor = "bg-red-500";
                }

                tb.innerHTML += `
                    <tr class="hover:bg-blue-50 transition border-b border-slate-100">
                        <td class="p-3 text-center border-r text-slate-500 font-bold">${i++}</td>
                        <td class="p-3 border-r text-center font-mono font-bold text-slate-700">${s.nis || s.no_peserta || '-'}</td>
                        <td class="p-3 border-r uppercase font-bold text-slate-800">${s.nama || '-'}</td>
                        <td class="p-3 border-r text-center text-slate-600">${s.kelas || '-'}</td>
                        <td class="p-3 border-r text-center">
                            <span class="${statusColor} ${statusBlinking} text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                ${statusText}
                            </span>
                        </td>
                        <td class="p-3 text-center">
                            <button onclick="resetIzinSiswa('${sId}', '${s.nama}')" class="bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200 px-3 py-1 rounded text-[11px] font-bold transition w-full shadow-sm">Reset Izin</button>
                        </td>
                    </tr>
                `;
            });
        }, (error) => {
            console.error("Radar Live Error:", error);
            tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-red-500 font-bold">Koneksi Live Terputus. Coba muat ulang.</td></tr>';
        });
    } catch (e) {
        console.error("Error setting up live status:", e);
    }
};

window.resetIzinSiswa = async (sesiId, nama) => {
    if(!confirm(`Yakin ingin mereset sesi ujian untuk siswa: ${nama}? (Siswa bisa login kembali)`)) return;
    try {
        await updateDoc(doc(db, 'cbt_sesi_siswa', sesiId), { status: "DIRESET (SILAKAN LOGIN ULANG)" });
    } catch(e) { console.error(e); }
};

window.resetLoginSiswa = async (id, nama) => {
    if (confirm(`Yakin ingin me-reset status login untuk ${nama}?`)) {
        try {
            await updateDoc(doc(db, 'master_siswa', id), { isOnline: false, currentExamSession: null });
            alert(`Berhasil! Sesi login ${nama} telah dibersihkan.`);
            window.loadStatusSiswa(); 
        } catch (e) { console.error(e); }
    }
};


// ============================================================================
// 8. HASIL, ANALISA & REKAP NILAI
// ============================================================================

// --- HASIL UJIAN ---
window.loadHasilUjian = async () => {
    try {
        if (state.masterKelas.length === 0) {
            const s1 = await getDocs(collection(db, 'master_kelas'));
            state.masterKelas = [];
            s1.forEach(d => state.masterKelas.push({id: d.id, ...d.data()}));
            state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        }
        if (state.masterJadwalUjian.length === 0) {
            const s2 = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            s2.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }

        const s3 = await getDocs(collection(db, 'exam_results'));
        state.allResults = [];
        s3.forEach(d => state.allResults.push({id: d.id, ...d.data()}));

        const selKelas = document.getElementById('filterHasilKelas');
        if(selKelas){
            selKelas.innerHTML = '<option value="">Pilih Kelas</option>';
            state.masterKelas.forEach(k => { selKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; });
        }

        const selJadwal = document.getElementById('filterHasilJadwal');
        if(selJadwal){
            selJadwal.innerHTML = '<option value="">Pilih Jadwal</option>';
            state.masterJadwalUjian.forEach(j => { selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} - ${j.jenis}</option>`; });
        }

        window.renderTableHasilUjian();
    } catch(e) { console.error("Error load hasil ujian:", e); }
};

window.renderTableHasilUjian = () => {
    const kelasVal = document.getElementById('filterHasilKelas')?.value;
    const jadwalVal = document.getElementById('filterHasilJadwal')?.value;
    const tb = document.getElementById('tableHasilUjianBody');
    if (!tb) return;
    tb.innerHTML = '';

    if (!kelasVal || !jadwalVal) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 bg-slate-50 italic">Silakan pilih Kelas dan Jadwal terlebih dahulu untuk menampilkan data nilai.</td></tr>';
        return;
    }

    let filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);

    if (filteredResults.length === 0) {
        tb.innerHTML = '<tr><td colspan="8" class="p-8 text-center text-slate-500 italic bg-slate-50">Belum ada data nilai yang masuk untuk kelas dan jadwal ini.</td></tr>';
        return;
    }

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
    const container = modal.querySelector('.bg-white'); 
    
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
    modal.classList.remove('hidden');
};

window.eksporHasilExcel = () => {
    const kelasVal = document.getElementById('filterHasilKelas').value;
    const jadwalVal = document.getElementById('filterHasilJadwal').value;
    if (!kelasVal || !jadwalVal) return alert("Filter Kelas dan Jadwal terlebih dahulu.");

    const filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);
    if (filteredResults.length === 0) return alert("Tidak ada data untuk diekspor.");

    const dataToExport = filteredResults.map((r, index) => ({
        "No": index + 1,
        "NIS/NISN": r.nis || r.nisn || "-",
        "Nama Peserta": r.nama,
        "Kelas": r.kelas,
        "Jumlah Benar": r.benar || 0,
        "Jumlah Salah": r.salah || 0,
        "NILAI AKHIR": r.skor || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Nilai");
    XLSX.writeFile(workbook, `Rekap_Nilai_${kelasVal}_Jadwal_${jadwalVal}.xlsx`);
};

window.katrolNilaiMassal = async () => {
    const kelasVal = document.getElementById('filterHasilKelas').value;
    const jadwalVal = document.getElementById('filterHasilJadwal').value;
    
    if (!kelasVal || !jadwalVal) return alert("Pilih Kelas dan Jadwal terlebih dahulu!");
    const filteredResults = state.allResults.filter(r => r.kelas === kelasVal && r.jadwalId === jadwalVal);
    if (filteredResults.length === 0) return alert("Tidak ada data nilai untuk dikatrol.");

    const tambahPoin = prompt(`Ditemukan ${filteredResults.length} nilai siswa.\nMasukkan jumlah poin tambahan (contoh: 10):`, "0");
    if (!tambahPoin || isNaN(tambahPoin) || parseInt(tambahPoin) === 0) return;

    const poin = parseInt(tambahPoin);
    if (!confirm(`Tambahkan ${poin} poin ke ${filteredResults.length} siswa (maksimal 100). Lanjutkan?`)) return;

    const btn = document.querySelector('button[onclick="katrolNilaiMassal()"]');
    if (btn) { btn.disabled = true; btn.innerText = "Memproses..."; }

    try {
        const promises = [];
        filteredResults.forEach(r => {
            let skorBaru = (r.skor || 0) + poin;
            if (skorBaru > 100) skorBaru = 100; 
            if (skorBaru < 0) skorBaru = 0;
            promises.push(updateDoc(doc(db, 'exam_results', r.id), { skor: skorBaru }));
        });
        await Promise.all(promises);
        alert("Katrol nilai berhasil diterapkan!");
        loadHasilUjian(); 
    } catch (e) { console.error(e); } finally {
        if (btn) { btn.disabled = false; btn.innerText = "⚖️ Katrol"; }
    }
};

// --- ANALISA BUTIR SOAL ---
window.loadAnalisaSoal = async () => {
    try {
        if (state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({ id: d.id, ...d.data() }));
        }

        const snapConfig = await getDoc(doc(db, 'settings', 'academic_config'));
        if (snapConfig.exists()) state.academicConfig = snapConfig.data();

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

        const selSmt = document.getElementById('filterAnalisaSmt');
        if (selSmt && state.academicConfig && state.academicConfig.activeSemester) {
            selSmt.value = state.academicConfig.activeSemester;
        }

        const selJadwal = document.getElementById('filterAnalisaJadwal');
        if (selJadwal) {
            selJadwal.innerHTML = '<option value="">-- Pilih Jadwal Ujian --</option>';
            state.masterJadwalUjian.filter(j => j.isActive).forEach(j => {
                selJadwal.innerHTML += `<option value="${j.id}">${j.mapel} - ${j.jenis}</option>`;
            });
        }

        document.getElementById('containerHasilAnalisa').innerHTML = '<div class="p-8 text-center text-slate-500 italic bg-slate-50 rounded border border-slate-100">Silakan pilih Jadwal Ujian untuk menampilkan hasil analisa butir soal.</div>';
    } catch (e) { console.error("Error load analisa:", e); }
};

window.renderAnalisaSoal = async () => {
    const jadwalId = document.getElementById('filterAnalisaJadwal').value;
    const container = document.getElementById('containerHasilAnalisa');

    if (!jadwalId) return;

    container.innerHTML = '<div class="p-12 text-center"><p class="text-blue-600 font-bold animate-pulse">Memproses algoritma statistik butir soal...</p></div>';

    try {
        const snapResults = await getDocs(collection(db, 'exam_results'));
        let results = [];
        snapResults.forEach(d => {
            const data = d.data();
            if (data.jadwalId === jadwalId) results.push(data);
        });

        if (results.length === 0) {
            container.innerHTML = '<div class="p-8 text-center text-red-500 italic bg-slate-50 rounded border border-slate-100">Belum ada siswa yang menyelesaikan ujian pada jadwal ini.</div>';
            return;
        }

        const sampleAnswers = results[0].detailJawaban || {};
        const totalSoal = Object.keys(sampleAnswers).length;

        if (totalSoal === 0) {
             container.innerHTML = '<div class="p-8 text-center text-red-500 italic bg-slate-50 rounded border border-slate-100">Format data jawaban tidak valid.</div>';
             return;
        }

        results.sort((a, b) => (b.skor || 0) - (a.skor || 0));
        const nKlp = Math.max(1, Math.round(results.length * 0.27));
        const klpAtas = results.slice(0, nKlp);
        const klpBawah = results.slice(-nKlp);
        let tableRows = '';

        for (let i = 1; i <= totalSoal; i++) {
            const indexSoal = i.toString();
            const benarTotal = results.filter(r => r.detailJawaban && r.detailJawaban[indexSoal]?.isCorrect).length;
            const benarAtas = klpAtas.filter(r => r.detailJawaban && r.detailJawaban[indexSoal]?.isCorrect).length;
            const benarBawah = klpBawah.filter(r => r.detailJawaban && r.detailJawaban[indexSoal]?.isCorrect).length;

            const tkValue = benarTotal / results.length;
            let tkLabel = tkValue > 0.70 ? "Mudah" : (tkValue >= 0.30 ? "Sedang" : "Sukar");

            const dpValue = (benarAtas / nKlp) - (benarBawah / nKlp);
            let dpLabel = "";
            if (dpValue >= 0.40) dpLabel = "Sangat Baik";
            else if (dpValue >= 0.30) dpLabel = "Baik";
            else if (dpValue >= 0.20) dpLabel = "Cukup";
            else dpLabel = "Buruk";
            
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

        container.innerHTML = `
            <div class="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h4 class="font-bold text-slate-800">Laporan Analisa Butir Soal (N = ${results.length} Peserta)</h4>
                <div class="text-xs text-slate-500 text-right">Kelompok Atas/Bawah: <b>${nKlp} Siswa (27%)</b></div>
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
                    <tbody id="tableBodyAnalisa" class="divide-y divide-slate-100 text-sm bg-white">${tableRows}</tbody>
                </table>
            </div>
            <div class="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                <b>Keterangan:</b> Soal <b>Diterima</b> jika nilai DP ≥ 0.20. Jika DP negatif, kelompok bawah lebih banyak menjawab benar daripada kelompok atas (soal menjebak/kunci salah).
            </div>`;
    } catch (e) {
        console.error("Gagal merender analisa:", e);
        container.innerHTML = '<div class="p-8 text-center text-red-600 bg-red-50 rounded border border-red-200">Terjadi kesalahan saat memproses perhitungan.</div>';
    }
};

window.eksporAnalisaExcel = () => {
    const tb = document.getElementById('tableBodyAnalisa');
    if(!tb || tb.innerHTML.includes('Belum ada')) return alert("Tidak ada data analisa untuk diekspor!");
    const table = tb.closest('table');
    const workbook = XLSX.utils.table_to_book(table, {sheet: "Analisa Soal"});
    XLSX.writeFile(workbook, `Analisa_Butir_Soal_CBT.xlsx`);
};

// --- REKAP NILAI ---
window.loadRekapNilai = async () => {
    try {
        const snapConfig = await getDoc(doc(db, 'settings', 'academic_config'));
        if(snapConfig.exists()) state.academicConfig = snapConfig.data();

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

        if(state.masterSoal.length === 0) {
            const snapBank = await getDocs(collection(db, 'master_bank_soal'));
            state.masterSoal = [];
            snapBank.forEach(d => state.masterSoal.push({id: d.id, ...d.data()}));
        }

        const snapResults = await getDocs(collection(db, 'exam_results'));
        state.allResults = [];
        snapResults.forEach(d => state.allResults.push({id: d.id, ...d.data()}));

        window.renderRekapNilai();
    } catch(e) { console.error("Error load rekap nilai:", e); }
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
        if(state.academicConfig.activeSemester) activeSmt = state.academicConfig.activeSemester;
    }

    if(!state.masterJadwalUjian || state.masterJadwalUjian.length === 0) {
        container.innerHTML = `<div class="bg-amber-100 border border-amber-200 text-amber-800 p-4 rounded shadow-sm text-sm">Belum ada jadwal penilaian untuk Tahun Pelajaran <b>${activeYear}</b> Semester: <b>${activeSmt}</b></div>`;
        return;
    }

    let tableRows = '';
    state.masterJadwalUjian.forEach((j, i) => {
        const bs = state.masterSoal.find(x => x.id === j.bankSoalId);
        const targetKelas = bs ? bs.kelas : null;

        const totalPeserta = targetKelas ? state.masterSiswa.filter(s => s.kelas === targetKelas).length : 0;
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
                <tbody class="divide-y divide-slate-200 text-sm bg-white">${tableRows}</tbody>
            </table>
        </div>
    `;
};


// ============================================================================
// 9. CETAK BERKAS
// ============================================================================
window.loadCetak = async () => {
    try {
        const snapProfil = await getDoc(doc(db, 'settings', 'profil_sekolah'));
        if(snapProfil.exists()) state.schoolProfile = snapProfil.data();

        if(state.masterSiswa.length === 0) {
            const snapSiswa = await getDocs(collection(db, 'master_siswa'));
            state.masterSiswa = [];
            snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));
        }

        if(state.masterJadwalUjian.length === 0) {
            const snapJadwal = await getDocs(collection(db, 'master_jadwal_ujian'));
            state.masterJadwalUjian = [];
            snapJadwal.forEach(d => state.masterJadwalUjian.push({id: d.id, ...d.data()}));
        }
    } catch(e) { console.error("Gagal menyiapkan data cetak:", e); }
};

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

window.cetakKartuPeserta = () => {
    if(state.masterSiswa.length === 0) return alert("Data siswa kosong!");
    const printWindow = window.open('', '_blank');
    let kartuHtml = '';
    
    state.masterSiswa.forEach((s, i) => {
        kartuHtml += `
            <div style="width: 45%; border: 2px solid black; padding: 10px; margin: 5px; display: inline-block; vertical-align: top; font-family: Arial;">
                <div style="text-align: center; font-weight: bold; font-size: 10pt; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">
                    KARTU PESERTA UJIAN<br>${(state.schoolProfile?.aplikasi || 'CBT GARAM').toUpperCase()}
                </div>
                <table style="font-size: 9pt; width: 100%;">
                    <tr><td width="30%">Nama</td><td>: ${s.nama}</td></tr>
                    <tr><td>No Peserta</td><td>: <b>${s.nis || s.nisn}</b></td></tr>
                    <tr><td>Kelas</td><td>: ${s.kelas}</td></tr>
                    <tr><td>Username</td><td>: ${s.username}</td></tr>
                    <tr><td>Password</td><td>: ${s.password}</td></tr>
                </table>
                <div style="margin-top: 10px; text-align: right; font-size: 8pt;">
                    Kepala Sekolah,<br><br><br><b>${state.schoolProfile?.kepsek || '................'}</b>
                </div>
            </div>
            ${(i + 1) % 8 === 0 ? '<div style="page-break-after: always;"></div>' : ''}
        `;
    });

    printWindow.document.write(`<html><head><title>Cetak Kartu</title></head><body>${kartuHtml}</body></html>`);
    printWindow.document.close();
    printWindow.print();
};

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

    printWindow.document.write(`
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
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

window.cetakBeritaAcara = () => {
    const p = state.schoolProfile || {};
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html><head><style>body { font-family: serif; padding: 40px; line-height: 1.6; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline;">BERITA ACARA PELAKSANAAN</h3>
            <p>Pada hari ini .................... tanggal ....... bulan .................... tahun 20..., telah diselenggarakan Penilaian Berbasis Komputer:</p>
            <table style="width: 100%;">
                <tr><td width="30%">Satuan Pendidikan</td><td>: ${p.sekolah || ''}</td></tr>
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
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

window.cetakPesertaUjian = () => {
    if (state.masterSiswa.length === 0) return alert("Data siswa belum dimuat! Pastikan ada siswa di Master Data.");

    const printWindow = window.open('', '_blank');
    let rows = '';

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

    printWindow.document.write(`
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
        </body></html>`);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};

window.cetakJadwalPengawas = async () => {
    const snap = await getDoc(doc(db, 'settings', 'pengawas_ujian'));
    if (!snap.exists()) return alert("Data alokasi pengawas belum diatur di menu Atur Pengawas!");
    
    const pengawasData = snap.data();
    const printWindow = window.open('', '_blank');
    let contentHtml = '';

    for (const jenisUjian in pengawasData) {
        let rows = '';
        const alokasi = pengawasData[jenisUjian];
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

    printWindow.document.write(`
        <html><head><style>body { font-family: serif; padding: 20px; }</style></head>
        <body>
            ${generateKopHTML()}
            <h3 style="text-align:center; text-decoration:underline; margin-bottom: 30px;">JADWAL PENGAWAS UJIAN</h3>
            ${contentHtml}
        </body></html>`);
    
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
};


// ============================================================================
// 10. USER MANAGEMENT (GURU & SISWA)
// ============================================================================
window.loadUserManagement = async () => {
    try {
        const snapGuru = await getDocs(collection(db, 'master_guru'));
        state.masterGuru = [];
        snapGuru.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        
        const snapSiswa = await getDocs(collection(db, 'master_siswa'));
        state.masterSiswa = [];
        snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()}));

        state.masterSiswa.sort((a,b) => {
            if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || '');
            return (a.kelas || '').localeCompare(b.kelas || '');
        });

        window.renderTableUserGuru();
        window.renderTableUserSiswa();
    } catch(e) { console.error("Error load user management:", e); }
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
        const btnStatus = isActive 
            ? `<button onclick="toggleStatusUser('master_guru', '${g.id}', true)" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">🚫 Nonaktifkan</button>`
            : `<button onclick="toggleStatusUser('master_guru', '${g.id}', false)" class="bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded transition shadow-sm text-[10px] font-bold w-full uppercase">✔️ Aktifkan</button>`;

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-b border-slate-100 ${!isActive ? 'opacity-50' : ''}">
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
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
        const newStatus = !currentStatus;
        await updateDoc(doc(db, collectionName, id), { isActive: newStatus });
        window.loadUserManagement(); 
    } catch(e) { console.error(e); }
};


// ============================================================================
// 11. PENGATURAN (PROFIL, PENGUMUMAN & BACKUP/RESET)
// ============================================================================

// --- PROFIL SEKOLAH ---
window.loadProfil = async () => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'profil_sekolah'));
        if(snap.exists()) {
            const d = snap.data();
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
            
            setVal('profAplikasi', d.aplikasi); setVal('profNpsn', d.npsn);
            setVal('profSekolah', d.sekolah); setVal('profNss', d.nss);
            setVal('profWebsite', d.website); setVal('profJenjang', d.jenjang);
            setVal('profAlamat', d.alamat); setVal('profDesa', d.desa);
            setVal('profEmail', d.email); setVal('profFaksimili', d.faksimili);
            setVal('profKabupaten', d.kabupaten); setVal('profKodePos', d.kodePos);
            setVal('profKepsek', d.kepsek); setVal('profKecamatan', d.kecamatan);
            setVal('profNipKepsek', d.nipKepsek); setVal('profSatPend', d.satPend);
            setVal('profProvinsi', d.provinsi); setVal('profTelepon', d.telepon);

            if(d.logoKiri && document.getElementById('logoKiriBase64')) document.getElementById('logoKiriBase64').value = d.logoKiri;
            if(d.logoKanan && document.getElementById('logoKananBase64')) document.getElementById('logoKananBase64').value = d.logoKanan;
            if(window.updatePreviewKop) window.updatePreviewKop();
        }
    } catch(e) { console.error("Error memuat profil:", e); }
};

window.simpanProfil = async () => {
    const btn = document.getElementById('btnSimpanProfil');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }
    
    const getVal = (id) => document.getElementById(id)?.value || '';

    const data = {
        aplikasi: getVal('profAplikasi'), npsn: getVal('profNpsn'),
        sekolah: getVal('profSekolah'), nss: getVal('profNss'),
        website: getVal('profWebsite'), jenjang: getVal('profJenjang'),
        alamat: getVal('profAlamat'), desa: getVal('profDesa'),
        email: getVal('profEmail'), faksimili: getVal('profFaksimili'),
        kabupaten: getVal('profKabupaten'), kodePos: getVal('profKodePos'),
        kepsek: getVal('profKepsek'), kecamatan: getVal('profKecamatan'),
        nipKepsek: getVal('profNipKepsek'), satPend: getVal('profSatPend'),
        provinsi: getVal('profProvinsi'), telepon: getVal('profTelepon'),
        logoKiri: getVal('logoKiriBase64'), logoKanan: getVal('logoKananBase64')
    };

    try {
        await setDoc(doc(db, 'settings', 'profil_sekolah'), data);
        state.schoolProfile = data; 
        alert("Profil Sekolah berhasil disimpan!");
        if(window.updatePreviewKop) window.updatePreviewKop();
    } catch(e) { console.error(e); } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan Profile"; }
    }
};

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

// --- PENGUMUMAN & RUNNING TEXT ---
window.loadPengumuman = async (isDashboard = false) => {
    try {
        const snap = await getDoc(doc(db, 'settings', 'pengumuman_config'));
        let config = { r1: '', r2: '', r3: '', kepada: '', teks: '' };
        if (snap.exists()) config = snap.data();

        if (isDashboard) {
            const txt = config.teks ? config.teks : 'Tidak ada pengumuman.';
            const dashText = document.getElementById('dashPengumumanText');
            if (dashText) dashText.innerHTML = txt;
        } else {
            const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
            setVal('rt1', config.r1); setVal('rt2', config.r2); setVal('rt3', config.r3);
            setVal('pengumumanKepada', config.kepada); setVal('pengumumanTeks', config.teks);
        }
    } catch(e) { console.error("Error load pengumuman:", e); }
};

window.simpanRunningText = async () => {
    const btn = document.querySelector('#viewPengumuman .bg-white:nth-child(1) button.bg-blue-600');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }
    
    const data = {
        r1: document.getElementById('rt1')?.value || '',
        r2: document.getElementById('rt2')?.value || '',
        r3: document.getElementById('rt3')?.value || ''
    };

    try {
        await setDoc(doc(db, 'settings', 'pengumuman_config'), data, { merge: true });
        alert('Running text berhasil disimpan! Teks akan muncul di layar siswa.');
    } catch(e) { console.error(e); } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan"; }
    }
};

window.simpanPengumuman = async () => {
    const btn = document.querySelector('#viewPengumuman .bg-white:nth-child(2) button.bg-blue-600') || document.querySelector('button[onclick="simpanPengumuman()"]');
    if (btn) { btn.disabled = true; btn.innerText = "Menyimpan..."; }
    
    try {
        const isiPengumuman = document.getElementById('inputPengumuman')?.value || document.getElementById('pengumumanTeks')?.value || '';
        const kepada = document.getElementById('pengumumanKepada')?.value || '';
        
        if (!isiPengumuman.trim()) return alert('Peringatan: Isi pengumuman masih kosong!');

        const data = { kepada: kepada, teks: isiPengumuman };
        await setDoc(doc(db, 'settings', 'pengumuman_config'), data, { merge: true });
        
        alert("✅ Pengumuman berhasil disimpan! Pesan ini sekarang akan terlihat di layar login/dashboard siswa.");
        if (typeof loadDashboard === 'function') loadDashboard(true);
    } catch (error) {
        console.error("Gagal menyimpan pengumuman:", error);
    } finally {
        if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan Pengumuman"; }
    }
};

// --- BACKUP & RESTORE ---
window.loadBackup = async () => {
    try {
        const snap = await getDocs(collection(db, 'backup_history'));
        state.backupHistory = [];
        snap.forEach(d => state.backupHistory.push({id: d.id, ...d.data()}));
        state.backupHistory.sort((a,b) => b.timestamp - a.timestamp);
        window.renderTableBackup();
    } catch(e) { console.error("Error load backup history:", e); }
};

window.renderTableBackup = () => {
    const viewBackup = document.getElementById('viewBackup');
    if(!viewBackup) return;
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
        const collectionsToBackup = [
            'settings', 'master_guru', 'master_siswa', 'master_kelas',
            'master_mapel', 'master_jurusan', 'master_ekskul',
            'master_jenis_ujian', 'master_sesi_ujian', 'master_ruang_ujian',
            'master_bank_soal', 'master_jadwal_ujian', 'exam_results'
        ];

        const backupData = {};
        for (const colName of collectionsToBackup) {
            const snap = await getDocs(collection(db, colName));
            backupData[colName] = [];
            snap.forEach(doc => { backupData[colName].push({ id: doc.id, ...doc.data() }); });
        }

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const sizeStr = (blob.size / 1024).toFixed(2) + " KB";

        const now = new Date();
        const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').split('.')[0];
        const filename = `backup_cbt_garam_${dateStr}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        await addDoc(collection(db, 'backup_history'), { filename: filename, size: sizeStr, timestamp: now.getTime() });

        alert("Backup berhasil! File JSON telah diunduh ke komputer Anda.");
        window.loadBackup(); 
    } catch (e) {
        console.error("Gagal backup:", e);
        alert("Terjadi kesalahan saat membackup data.");
    } finally {
        if(btn) { btn.innerText = "BACKUP SEMUA DATA"; btn.disabled = false; }
    }
};

window.hapusRiwayatBackup = async (id) => {
    if(confirm("Hapus catatan riwayat backup ini? (Hanya menghapus riwayat di tabel, file di PC Anda aman)")) {
        await deleteDoc(doc(db, 'backup_history', id));
        window.loadBackup();
    }
};

// --- BERSIHKAN DATA (HAPUS MASSAL & RESET TOTAL) ---
window.loadBersihkan = async () => {
    try {
        const collectionsMap = [
            { id: 'count_bs', name: 'master_bank_soal', label: 'Bank Soal' },
            { id: 'count_jdw', name: 'master_jadwal_ujian', label: 'Jadwal Ujian' },
            { id: 'count_nl', name: 'exam_results', label: 'Hasil Ujian (Nilai)' },
            { id: 'count_ss', name: 'master_sesi_ujian', label: 'Sesi Ujian' },
            { id: 'count_guru', name: 'master_guru', label: 'Master Guru' },
            { id: 'count_jrs', name: 'master_jurusan', label: 'Master Jurusan' },
            { id: 'count_kls', name: 'master_kelas', label: 'Master Kelas' },
            { id: 'count_mapel', name: 'master_mapel', label: 'Master Mapel' },
            { id: 'count_siswa', name: 'master_siswa', label: 'Master Siswa' }
        ];

        for (const c of collectionsMap) {
            const tdCount = document.getElementById(c.id);
            if (tdCount) {
                tdCount.innerText = '...'; 
                const snap = await getDocs(collection(db, c.name));
                tdCount.innerText = snap.size;

                const tdAction = tdCount.nextElementSibling;
                if(tdAction) {
                    const btn = tdAction.querySelector('button');
                    if(btn) btn.onclick = () => window.kosongkanKoleksi(c.name, c.label, c.id);
                }
            }
        }
    } catch (e) { console.error("Error load bersihkan data:", e); }
};

window.kosongkanKoleksi = async (collectionName, label, elementId) => {
    if (!confirm(`PERINGATAN KERAS!\n\nAnda yakin ingin MENGHAPUS SEMUA DATA [${label}]?\nAksi ini permanen. Pastikan Anda sudah melakukan BACKUP.`)) return;
    if (collectionName.includes('master_') && !confirm(`Ini adalah Data Master (${label}). Yakin tetap kosongkan?`)) return;

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
            if (collectionName === 'master_bank_soal') {
                getDocs(collection(db, `master_bank_soal/${docItem.id}/butir_soal`)).then(subSnap => {
                    subSnap.forEach(subDoc => { deleteDoc(doc(db, `master_bank_soal/${docItem.id}/butir_soal`, subDoc.id)); });
                });
            }
        });

        await Promise.all(promises);
        
        if(collectionName === 'master_siswa') state.masterSiswa = [];
        if(collectionName === 'master_guru') state.masterGuru = [];
        if(collectionName === 'master_kelas') state.masterKelas = [];
        if(collectionName === 'master_mapel') state.masterMapel = [];
        if(collectionName === 'master_bank_soal') state.masterSoal = [];
        if(collectionName === 'master_jadwal_ujian') state.masterJadwalUjian = [];
        if(collectionName === 'exam_results') state.allResults = [];

        alert(`Seluruh data [${label}] berhasil dikosongkan!`);
        tdCount.innerText = '0'; 
    } catch (e) { console.error(e); } finally {
        btn.innerHTML = originalHTML; btn.disabled = false;
    }
};

window.hapusSeluruhDatabase = async () => {
    if (!confirm("PERINGATAN TINGKAT TINGGI!\n\nAnda akan menghapus SELURUH DATA aplikasi CBT GARAM.\nData Siswa, Guru, Bank Soal, Jadwal, dan Nilai akan hilang selamanya.\n\nApakah Anda benar-benar yakin?")) return;
    if (!confirm("Peringatan Terakhir!\n\nPastikan Anda sudah melakukan BACKUP DATA terlebih dahulu.\n\nKlik OK jika Anda sudah siap melakukan Reset Total.")) return;
    
    const verifyText = prompt("Ketik kata 'HAPUS' untuk mengonfirmasi penghapusan massal ini:");
    if (verifyText !== "HAPUS") return alert("Konfirmasi gagal. Data batal dihapus.");

    const collectionsToWipe = [
        'master_siswa', 'master_guru', 'master_kelas', 'master_mapel', 
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
                promises.push(deleteDoc(doc(db, colName, docItem.id)));
                if (colName === 'master_bank_soal') {
                    getDocs(collection(db, `master_bank_soal/${docItem.id}/butir_soal`)).then(subSnap => {
                        subSnap.forEach(subDoc => { deleteDoc(doc(db, `master_bank_soal/${docItem.id}/butir_soal`, subDoc.id)); });
                    });
                }
            });
            await Promise.all(promises);
        }
        alert("DATABASE BERHASIL DIRESET TOTAL!\nSistem akan dimuat ulang untuk menyegarkan tampilan.");
        location.reload();
    } catch (error) { console.error("Gagal melakukan reset database:", error); }
};

// ============================================================================
// 12. INISIALISASI EVENT LISTENER OTOMATIS
// ============================================================================
setTimeout(() => {
    const attachLoad = (btnId, func) => {
        const btn = document.getElementById(btnId);
        if (btn) btn.addEventListener('click', func);
    };

    attachLoad('btn-viewBackup', window.loadBackup);
    attachLoad('btn-viewProfil', window.loadProfil);
    attachLoad('btn-viewPengumuman', () => window.loadPengumuman(false));
    attachLoad('btn-viewBersihkan', window.loadBersihkan);

    const btnProsesBackup = document.querySelector('#viewBackup button.bg-blue-500');
    if (btnProsesBackup) btnProsesBackup.onclick = window.backupSemuaData;
}, 1000);
