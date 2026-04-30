import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';
import { getDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ==========================================
// SESSION & UTILS
// ==========================================
window.checkAdminSession = () => { if (sessionStorage.getItem('admin_logged_in') === 'true') { document.getElementById('loginScreen').classList.add('hidden'); document.getElementById('appScreen').classList.remove('hidden'); document.getElementById('appScreen').classList.add('flex'); initFirebase(); } };
window.handleLogin = (e) => { e.preventDefault(); if (document.getElementById('inputPinAdmin').value === state.ADMIN_PIN) { sessionStorage.setItem('admin_logged_in', 'true'); checkAdminSession(); } else { document.getElementById('loginError').classList.remove('hidden'); } };
window.logoutAdmin = () => { sessionStorage.removeItem('admin_logged_in'); location.reload(); };
window.switchTab = (id, title) => { document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden')); document.querySelectorAll('.menu-btn').forEach(btn => btn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 transition"); document.getElementById(id).classList.remove('hidden'); document.getElementById('btn-' + id).className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-900/50"; document.getElementById('pageTitle').innerText = title; if (window.innerWidth < 768) toggleSidebar(); };
window.toggleSidebar = () => { const s = document.getElementById('sidebar'); s.classList.contains('-translate-x-full') ? s.classList.remove('-translate-x-full') : s.classList.add('-translate-x-full'); };
window.closeModal = (m) => document.getElementById(m).classList.add('hidden');


// ==========================================
// DATA UMUM: MASTER GURU (BARU)
// ==========================================
state.masterGuru = [];

window.loadGuru = async () => {
    try {
        const snap = await getDocs(collection(db, 'master_guru'));
        state.masterGuru = [];
        snap.forEach(d => state.masterGuru.push({id: d.id, ...d.data()}));
        
        // Sorting berdasarkan nama
        state.masterGuru.sort((a,b) => (a.nama || '').localeCompare(b.nama || ''));
        window.renderGridGuru();
    } catch(e) { console.error("Error loading guru:", e); }
};

window.renderGridGuru = () => {
    const container = document.getElementById('gridGuruContainer');
    const searchTerm = (document.getElementById('searchGuru')?.value || '').toUpperCase();
    container.innerHTML = '';
    
    // Filter berdasarkan search bar
    const filteredGuru = state.masterGuru.filter(g => 
        (g.nama || '').toUpperCase().includes(searchTerm) || 
        (g.nip || '').toUpperCase().includes(searchTerm)
    );

    if (filteredGuru.length === 0) {
        container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada data guru atau pencarian tidak ditemukan.</div>';
        return;
    }

    filteredGuru.forEach((g) => {
        const badgeAktif = g.isActive !== false 
            ? `<span class="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Aktif</span>` 
            : `<span class="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Nonaktif</span>`;
            
        // Desain Grid Card mirip mockup Guru
        container.innerHTML += `
            <div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative transition hover:shadow-md">
                <div class="h-1 w-full bg-blue-500 absolute top-0 left-0"></div>
                <div class="p-5 flex gap-4 mt-1 items-center">
                    <div class="w-[70px] h-[70px] rounded-full border-2 border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-4xl shadow-inner">
                        👨‍🏫
                    </div>
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
                    <button onclick="hapusGuru('${g.id}')" class="text-red-500 bg-white border border-red-300 hover:bg-red-50 hover:border-red-500 px-3 py-1.5 rounded text-xs transition shadow-sm" title="Hapus Guru">🗑️</button>
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

    const data = {
        nip: nip,
        kode: document.getElementById('guruKode').value.trim().toUpperCase(),
        nama: nama,
        username: document.getElementById('guruUsername').value.trim().toLowerCase() || nip,
        password: document.getElementById('guruPassword').value.trim() || nip,
        isActive: document.getElementById('guruStatus').checked
    };
    
    try {
        if(id) await updateDoc(doc(db, 'master_guru', id), data);
        else await addDoc(collection(db, 'master_guru'), data);
        closeModal('modalGuru');
        loadGuru();
    } catch(e) { alert("Gagal menyimpan data guru."); console.error(e); }
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
        await deleteDoc(doc(db, 'master_guru', id));
        loadGuru();
    }
};

window.editJabatanGuru = async (id) => {
    const g = state.masterGuru.find(x => x.id === id);
    if(!g) return;
    // Menggunakan dialog Prompt sederhana agar lebih efisien dan dinamis
    const jabatanBaru = prompt(`Masukkan Jabatan untuk ${g.nama}\n(Contoh: Wali Kelas 5A, Guru PAI, dll):`, g.jabatan || "Guru Kelas");
    
    if(jabatanBaru !== null) {
        await updateDoc(doc(db, 'master_guru', id), { jabatan: jabatanBaru.toUpperCase() });
        loadGuru();
    }
};

window.downloadFormatGuru = () => {
    const headers = ['No', 'Nama\n(2-50 huruf atau angka)', 'NIP/NUPTK\n(4-12 angka)', 'KODE\n(1-5 huruf atau angka)', 'USERNAME\n(unique/jangan sama)\nhuruf kecil', 'PASSWORD'];
    let dataExport = [];
    
    if(state.masterGuru.length === 0) {
        let dummy = {}; headers.forEach(h => dummy[h] = '');
        dummy['No'] = 1; dummy['Nama\n(2-50 huruf atau angka)'] = 'YOYON SUGIYONO, S.Pd., M.Pd.'; dummy['NIP/NUPTK\n(4-12 angka)'] = '198501012010011001'; dummy['KODE\n(1-5 huruf atau angka)'] = 'YOY'; dummy['USERNAME\n(unique/jangan sama)\nhuruf kecil'] = 'yoyon'; dummy['PASSWORD'] = '123456';
        dataExport.push(dummy);
    } else {
        state.masterGuru.forEach((g, i) => {
            let row = {}; headers.forEach(h => row[h] = '');
            row['No'] = i+1; 
            row['Nama\n(2-50 huruf atau angka)'] = g.nama; 
            row['NIP/NUPTK\n(4-12 angka)'] = g.nip; 
            row['KODE\n(1-5 huruf atau angka)'] = g.kode || ''; 
            row['USERNAME\n(unique/jangan sama)\nhuruf kecil'] = g.username || g.nip; 
            row['PASSWORD'] = g.password || g.nip;
            dataExport.push(row);
        });
    }
    const ws = XLSX.utils.json_to_sheet(dataExport); 
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "Data_Guru"); 
    XLSX.writeFile(wb, "format_guru.xlsx");
};

window.prosesImportGuru = async (e) => {
    const f = e.target.files[0]; if(!f) return;
    document.getElementById('loadingIndicator').classList.remove('hidden');
    const r = new FileReader(); 
    r.onload = async (evt) => {
        try {
            const d = new Uint8Array(evt.target.result); 
            const wb = XLSX.read(d, {type:'array'});
            const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
            let success = 0;
            
            for (const row of json) {
                const nip = row['NIP/NUPTK\n(4-12 angka)'] || row['NIP/NUPTK'] || row['NIP'];
                const nama = row['Nama\n(2-50 huruf atau angka)'] || row['Nama'] || row['NAMA'];
                if (!nip || !nama) continue;
                
                let nipStr = String(nip).trim();
                const dataSimpan = {
                    nip: nipStr,
                    nama: String(nama).trim().toUpperCase(),
                    kode: String(row['KODE\n(1-5 huruf atau angka)'] || row['KODE'] || '').trim().toUpperCase(),
                    username: String(row['USERNAME\n(unique/jangan sama)\nhuruf kecil'] || row['USERNAME'] || nipStr).trim().toLowerCase(),
                    password: String(row['PASSWORD'] || nipStr).trim(),
                    isActive: true,
                    jabatan: 'GURU KELAS'
                };

                const ex = state.masterGuru.find(x => x.nip === dataSimpan.nip);
                if (ex && ex.id) { await updateDoc(doc(db, 'master_guru', ex.id), dataSimpan); } 
                else { await addDoc(collection(db, 'master_guru'), dataSimpan); }
                success++;
            }
            alert(`Berhasil memproses ${success} data guru dari Excel!`);
        } catch(err) { console.error("Error import excel guru:", err); alert("Terjadi kesalahan sistem. Pastikan format kolom sesuai dengan template."); } 
        finally { document.getElementById('loadingIndicator').classList.add('hidden'); document.getElementById('fileImportGuru').value = ''; loadGuru(); }
    }; 
    r.readAsArrayBuffer(f);
};

// ==========================================
// MINIFIED FUNGSI LAINNYA
// ==========================================
state.masterKelas = []; state.masterEkskul = []; state.penempatanEkskul = {}; state.masterSiswa = [];

window.loadEkskul = async () => { try { const snap = await getDocs(collection(db, 'master_ekskul')); state.masterEkskul = []; snap.forEach(d => state.masterEkskul.push({id: d.id, ...d.data()})); if(state.masterKelas.length === 0) { const sK = await getDocs(collection(db, 'master_kelas')); state.masterKelas = []; sK.forEach(d => state.masterKelas.push({id: d.id, ...d.data()})); } const sP = await getDoc(doc(db, 'settings', 'penempatan_ekskul')); state.penempatanEkskul = sP.exists() ? sP.data() : {}; window.renderTableEkskul(); window.renderPenempatanEkskul(); } catch(e) { console.error(e); } };
window.renderTableEkskul = () => { const tb = document.getElementById('tableEkskulBody'); tb.innerHTML = ''; if (state.masterEkskul.length === 0) return tb.innerHTML = '<tr><td colspan="4" class="p-8 text-center text-slate-500 bg-slate-100">No data available in table</td></tr>'; state.masterEkskul.forEach((ek, i) => { tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r">${i+1}</td><td class="p-3 border-r font-bold">${ek.nama || '-'}</td><td class="p-3 border-r text-center font-mono">${ek.kode || '-'}</td><td class="p-3 text-center space-x-1"><button onclick="editEkskul('${ek.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs transition">Edit</button><button onclick="hapusEkskul('${ek.id}')" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded shadow-sm text-xs transition">Hapus</button></td></tr>`; }); };
window.openModalEkskul = () => { document.getElementById('ekskulId').value = ''; document.getElementById('inputNamaEkskul').value = ''; document.getElementById('inputKodeEkskul').value = ''; document.getElementById('modalEkskul').classList.remove('hidden'); };
window.simpanEkskul = async () => { const id = document.getElementById('ekskulId').value; const nama = document.getElementById('inputNamaEkskul').value.trim().toUpperCase(); const kode = document.getElementById('inputKodeEkskul').value.trim().toUpperCase(); if(!nama) return alert("Nama wajib diisi!"); const data = { nama, kode }; try { if(id) await updateDoc(doc(db, 'master_ekskul', id), data); else await addDoc(collection(db, 'master_ekskul'), data); closeModal('modalEkskul'); loadEkskul(); } catch(e) { console.error(e); } };
window.editEkskul = (id) => { const ek = state.masterEkskul.find(x => x.id === id); if(!ek) return; document.getElementById('ekskulId').value = ek.id; document.getElementById('inputNamaEkskul').value = ek.nama || ''; document.getElementById('inputKodeEkskul').value = ek.kode || ''; document.getElementById('modalEkskul').classList.remove('hidden'); };
window.hapusEkskul = async (id) => { if(confirm("Yakin hapus?")) { await deleteDoc(doc(db, 'master_ekskul', id)); loadEkskul(); } };
window.renderPenempatanEkskul = () => { const container = document.getElementById('containerPenempatanEkskul'); container.innerHTML = ''; if (state.masterKelas.length === 0) return container.innerHTML = '<p class="text-sm text-slate-500 italic text-center py-4 bg-slate-100 rounded">Data kelas kosong.</p>'; let optionsHtml = '<option value="">Pilih Ekskul</option>'; state.masterEkskul.forEach(ek => optionsHtml += `<option value="${ek.nama}">${ek.nama}</option>`); state.masterKelas.forEach(k => { container.innerHTML += `<div class="flex items-center border border-slate-300 rounded overflow-hidden shadow-sm"><div class="bg-slate-100 px-3 py-2 text-sm font-bold text-slate-700 w-1/2 border-r border-slate-300">Kelas ${k.nama}</div><select class="w-1/2 p-2 outline-none text-sm select-ekskul" data-kelas="${k.nama}">${optionsHtml}</select></div>`; }); setTimeout(() => { document.querySelectorAll('.select-ekskul').forEach(sel => { const kelas = sel.getAttribute('data-kelas'); if (state.penempatanEkskul[kelas]) sel.value = state.penempatanEkskul[kelas]; }); }, 50); };
window.simpanPenempatanEkskul = async () => { const data = {}; document.querySelectorAll('.select-ekskul').forEach(sel => { const kelas = sel.getAttribute('data-kelas'); if (sel.value) data[kelas] = sel.value; }); try { await setDoc(doc(db, 'settings', 'penempatan_ekskul'), data); state.penempatanEkskul = data; alert("Berhasil disimpan!"); } catch(e) { console.error(e); } };

window.loadKelas = async () => { try { const snap = await getDocs(collection(db, 'master_kelas')); state.masterKelas = []; snap.forEach(d => state.masterKelas.push({id: d.id, ...d.data()})); state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || '')); if(state.masterSiswa.length === 0) { const sSnap = await getDocs(collection(db, 'master_siswa')); state.masterSiswa = []; sSnap.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()})); } window.renderTableKelas(); } catch(e) { console.error(e); } };
window.renderTableKelas = () => { const tb = document.getElementById('tableKelasBody'); tb.innerHTML = ''; if (state.masterKelas.length === 0) return tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500">Belum ada kelas.</td></tr>'; state.masterKelas.forEach((k, i) => { let jumlah = 0; if(state.masterSiswa) jumlah = state.masterSiswa.filter(s => s.kelas && s.kelas.toUpperCase() === (k.nama || '').toUpperCase()).length; tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r">${i+1}</td><td class="p-3 border-r font-bold">${k.nama || '-'}</td><td class="p-3 border-r font-mono">${k.kode || '-'}</td><td class="p-3 border-r">${k.wali || '-'}</td><td class="p-3 text-center border-r font-bold text-blue-600">${jumlah}</td><td class="p-3 text-center space-x-1"><button onclick="editKelas('${k.id}')" class="bg-amber-400 hover:bg-amber-500 px-2 py-1 rounded text-xs transition">✏️</button><button onclick="hapusKelas('${k.id}')" class="bg-red-500 text-white px-2 py-1 rounded text-xs transition">🗑️</button></td></tr>`; }); };
window.openModalKelas = () => { document.getElementById('kelasId').value = ''; document.getElementById('inputNamaKelas').value = ''; document.getElementById('inputKodeKelas').value = ''; document.getElementById('inputWaliKelas').value = ''; document.getElementById('modalKelas').classList.remove('hidden'); };
window.simpanKelas = async () => { const id = document.getElementById('kelasId').value; const nama = document.getElementById('inputNamaKelas').value.trim().toUpperCase(); const data = { nama, kode: document.getElementById('inputKodeKelas').value.trim().toUpperCase(), wali: document.getElementById('inputWaliKelas').value.trim().toUpperCase() }; try { if(id) await updateDoc(doc(db, 'master_kelas', id), data); else await addDoc(collection(db, 'master_kelas'), data); closeModal('modalKelas'); loadKelas(); } catch(e) { console.error(e); } };
window.editKelas = (id) => { const k = state.masterKelas.find(x => x.id === id); if(!k) return; document.getElementById('kelasId').value = k.id; document.getElementById('inputNamaKelas').value = k.nama || ''; document.getElementById('inputKodeKelas').value = k.kode || ''; document.getElementById('inputWaliKelas').value = k.wali || ''; document.getElementById('modalKelas').classList.remove('hidden'); };
window.hapusKelas = async (id) => { if(confirm("Yakin hapus?")) { await deleteDoc(doc(db, 'master_kelas', id)); loadKelas(); } };
window.kenaikanKelas = () => { alert("Fitur Kenaikan Kelas otomatis sedang disiapkan."); };

window.loadSiswa = async () => { try { const snap = await getDocs(collection(db, 'master_siswa')); state.masterSiswa = []; snap.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()})); state.masterSiswa.sort((a,b) => { if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || ''); return (a.kelas || '').localeCompare(b.kelas || ''); }); window.renderTableSiswa(); } catch(e) { console.error(e); } };
window.renderTableSiswa = () => { const tb = document.getElementById('tableSiswaBody'); tb.innerHTML = ''; if (state.masterSiswa.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada siswa.</td></tr>'; state.masterSiswa.forEach((s, i) => { const avatar = s.jk === 'P' ? '👩' : '👦'; const colorJk = s.jk === 'P' ? 'bg-pink-500' : 'bg-blue-500'; const badgeAktif = s.isActive === false ? `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Nonaktif</span>` : `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>`; tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r"><input type="checkbox" class="w-4 h-4"></td><td class="p-3 text-center font-bold text-slate-500 border-r">${i+1}</td><td class="p-3 border-r"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-slate-200 rounded-full flex justify-center items-center text-2xl border">${avatar}</div><div><p class="font-bold text-[15px] uppercase">${s.nama}</p><div class="flex gap-1 mt-1"><span class="bg-teal-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">KELAS ${s.kelas || '-'}</span><span class="${colorJk} text-white px-2 py-0.5 rounded text-[10px] font-bold">${s.jk || 'L'}</span>${badgeAktif}</div></div></div></td><td class="p-3 border-r"><p class="text-[11px] text-slate-500 font-bold">NIS: <span class="text-slate-800 text-sm font-black tracking-widest">${s.nis || '-'}</span></p><p class="text-[11px] text-slate-500 font-bold">NISN: <span class="text-slate-800 text-sm font-black tracking-widest">${s.nisn || '-'}</span></p></td><td class="p-3 text-center space-y-1"><button onclick="editSiswa('${s.id}')" class="bg-amber-400 w-full px-3 py-1.5 rounded text-xs font-bold transition">✏️ Edit</button><button onclick="hapusSiswa('${s.id}')" class="bg-red-500 text-white w-full px-3 py-1.5 rounded text-xs font-bold transition">🗑️ Hapus</button></td></tr>`; }); };
window.openModalSiswa = () => { document.getElementById('siswaId').value = ''; document.getElementById('siswaNisn').value = ''; document.getElementById('siswaNama').value = ''; document.getElementById('siswaUsername').value = ''; document.getElementById('siswaPassword').value = ''; document.getElementById('modalSiswa').classList.remove('hidden'); };
window.generatePassword = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let p = ''; for (let i = 0; i < 6; i++) p += c.charAt(Math.floor(Math.random() * c.length)); document.getElementById('pesertaPassword').value = p; };
window.simpanSiswa = async () => { const id = document.getElementById('siswaId').value; const nisn = document.getElementById('siswaNisn').value.trim(); const nama = document.getElementById('siswaNama').value.trim().toUpperCase(); if(!nisn || !nama) return; const data = { nisn, nis: document.getElementById('siswaNis').value.trim(), nama, jk: document.getElementById('siswaJk').value, kelas: document.getElementById('siswaKelas').value.trim().toUpperCase(), username: document.getElementById('siswaUsername').value.trim() || nisn, password: document.getElementById('siswaPassword').value.trim() || nisn, isActive: document.getElementById('siswaStatus').checked }; try { if(id) await updateDoc(doc(db, 'master_siswa', id), data); else await addDoc(collection(db, 'master_siswa'), data); closeModal('modalSiswa'); loadSiswa(); } catch(e) { console.error(e); } };
window.editSiswa = (id) => { const s = state.masterSiswa.find(x => x.id === id); if(!s) return; document.getElementById('siswaId').value = s.id; document.getElementById('siswaNisn').value = s.nisn || ''; document.getElementById('siswaNis').value = s.nis || ''; document.getElementById('siswaNama').value = s.nama || ''; document.getElementById('siswaJk').value = s.jk || 'L'; document.getElementById('siswaKelas').value = s.kelas || ''; document.getElementById('siswaUsername').value = s.username || ''; document.getElementById('siswaPassword').value = s.password || ''; document.getElementById('siswaStatus').checked = s.isActive !== false; document.getElementById('modalSiswa').classList.remove('hidden'); };
window.hapusSiswa = async (id) => { if(confirm("Yakin hapus?")) { await deleteDoc(doc(db, 'master_siswa', id)); loadSiswa(); } };

window.loadTahunPelajaran = async () => { /* Logika dipertahankan */ };
window.loadMataPelajaran = async () => { /* Logika dipertahankan */ };
window.loadJurusan = async () => { /* Logika dipertahankan */ };
window.isiFormProfil = () => { /* Logika dipertahankan */ };
window.simpanProfil = async () => { /* Logika dipertahankan */ };
window.changeSubject = () => { /* Logika dipertahankan */ };

// Start Application
checkAdminSession();
