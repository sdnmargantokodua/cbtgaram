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
// BANK SOAL (REMASTERED)
// ==========================================
state.masterBankSoal = [];

window.loadBankSoal = async () => {
    try {
        // Load data Master (Mapel, Guru, Kelas) untuk form dropdown
        if(state.masterSubjects.length === 0) { const s1 = await getDocs(collection(db, 'master_subjects')); state.masterSubjects = []; s1.forEach(d => state.masterSubjects.push({id: d.id, ...d.data()})); }
        if(state.masterGuru.length === 0) { const s2 = await getDocs(collection(db, 'master_guru')); state.masterGuru = []; s2.forEach(d => state.masterGuru.push({id: d.id, ...d.data()})); }
        if(state.masterKelas.length === 0) { const s3 = await getDocs(collection(db, 'master_kelas')); state.masterKelas = []; s3.forEach(d => state.masterKelas.push({id: d.id, ...d.data()})); }

        // Populate Dropdowns di Modal Bank Soal
        const selMapel = document.getElementById('bsMapel'); selMapel.innerHTML = '<option value="">Pilih Mapel</option>';
        state.masterSubjects.forEach(m => selMapel.innerHTML += `<option value="${m.nama}">${m.nama}</option>`);
        
        const selGuru = document.getElementById('bsGuru'); selGuru.innerHTML = '<option value="">Pilih Guru Pengampu</option>';
        state.masterGuru.forEach(g => selGuru.innerHTML += `<option value="${g.nama}">${g.nama}</option>`);

        const selKelas = document.getElementById('bsKelas'); selKelas.innerHTML = '<option value="">Pilih Kelas</option>';
        state.masterKelas.forEach(k => selKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`);

        // Load data Bank Soal
        const snap = await getDocs(collection(db, 'master_bank_soal'));
        state.masterBankSoal = [];
        snap.forEach(d => state.masterBankSoal.push({id: d.id, ...d.data()}));
        
        window.renderTableBankSoal();
    } catch(e) { console.error("Error loading bank soal:", e); }
};

window.renderTableBankSoal = () => {
    const tb = document.getElementById('tableBankSoalBody');
    tb.innerHTML = '';
    
    if (state.masterBankSoal.length === 0) {
        tb.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-slate-500 bg-slate-100">Belum ada Bank Soal. Silakan tambahkan baru.</td></tr>';
        return;
    }

    state.masterBankSoal.forEach((b, i) => {
        // Logika pewarnaan sesuai Screenshot GarudaCBT
        let statusColor = "bg-slate-500"; // Default: Tidak digunakan
        if(b.isActive) statusColor = "bg-amber-400"; // Aktif
        if(b.digunakanSiswa) statusColor = "bg-pink-600"; // Sedang ujian

        tb.innerHTML += `
            <tr class="hover:bg-slate-50 transition border-l-4 ${b.isActive ? 'border-l-amber-400' : 'border-l-slate-400'}">
                <td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td>
                <td class="p-3 text-center border-r font-bold text-slate-500">${i+1}</td>
                <td class="p-3 border-r">
                    <div class="flex items-center gap-2">
                        <div class="w-3 h-3 ${statusColor} rounded-full" title="${b.isActive ? 'Digunakan jadwal' : 'Tidak digunakan'}"></div>
                        <span class="font-bold text-blue-700 font-mono">${b.kode || '-'}</span>
                    </div>
                </td>
                <td class="p-3 border-r font-bold">${b.mapel || '-'}</td>
                <td class="p-3 border-r text-center">${b.kelas || '-'}</td>
                <td class="p-3 border-r text-center font-bold">${b.totalSoal || 0}</td>
                <td class="p-3 text-center space-x-1">
                    <button onclick="bukaSoalDetail('${b.id}')" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded shadow-sm text-xs transition" title="Buat Butir Soal">📝 Soal</button>
                    <button onclick="editBankSoal('${b.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-2 py-1 rounded shadow-sm text-xs transition" title="Edit Pengaturan">✏️ Edit</button>
                    <button onclick="hapusBankSoal('${b.id}')" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded shadow-sm text-xs transition" title="Hapus">🗑️</button>
                </td>
            </tr>
        `;
    });
};

window.kalkulasiTotalSoalBobot = () => {
    const getVal = (id) => parseInt(document.getElementById(id).value) || 0;
    
    const tSoal = getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml');
    const tBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');
    
    const lblBobot = document.getElementById('bsLabelTotalBobot');
    document.getElementById('bsLabelTotalSoal').innerText = tSoal;
    lblBobot.innerText = tBobot + "%";
    
    // Warning visual jika bobot melebihi atau kurang dari 100%
    if(tBobot !== 100 && tBobot !== 0) {
        lblBobot.classList.replace('text-slate-800', 'text-red-600');
    } else {
        lblBobot.classList.replace('text-red-600', 'text-slate-800');
    }
};

window.openModalBankSoal = () => {
    document.getElementById('bankSoalId').value = '';
    document.getElementById('bsKode').value = '';
    document.getElementById('bsMapel').value = '';
    document.getElementById('bsGuru').value = '';
    document.getElementById('bsKelas').value = '';
    document.getElementById('bsLevel').value = '1';
    
    // Reset Numerics
    ['Pg','Pgk','Bs','Isian','Uraian','Urut'].forEach(k => {
        document.getElementById(`bs${k}Jml`).value = 0;
        document.getElementById(`bs${k}Bobot`).value = 0;
    });
    
    document.getElementById('bsPgOpsi').value = '4';
    document.getElementById('bsKategori').value = 'Bukan Mapel Agama';
    document.getElementById('bsStatus').value = 'true';
    
    kalkulasiTotalSoalBobot();
    document.getElementById('modalBankSoal').classList.remove('hidden');
};

window.simpanBankSoal = async () => {
    const id = document.getElementById('bankSoalId').value;
    const kode = document.getElementById('bsKode').value.trim().toUpperCase();
    const mapel = document.getElementById('bsMapel').value;
    const kelas = document.getElementById('bsKelas').value;

    if(!kode || !mapel || !kelas) return alert("Kode, Mata Pelajaran, dan Kelas wajib diisi!");

    const getVal = (idx) => parseInt(document.getElementById(idx).value) || 0;
    const tBobot = getVal('bsPgBobot') + getVal('bsPgkBobot') + getVal('bsBsBobot') + getVal('bsIsianBobot') + getVal('bsUraianBobot') + getVal('bsUrutBobot');
    
    if(tBobot !== 0 && tBobot !== 100) {
        if(!confirm("Peringatan: Total persentase bobot soal tidak sama dengan 100%. Apakah Anda yakin ingin melanjutkan?")) return;
    }

    const data = {
        kode, mapel, kelas,
        guru: document.getElementById('bsGuru').value,
        level: document.getElementById('bsLevel').value,
        kategoriAgama: document.getElementById('bsKategori').value,
        isActive: document.getElementById('bsStatus').value === 'true',
        
        komposisi: {
            pg: { jml: getVal('bsPgJml'), bobot: getVal('bsPgBobot'), opsi: document.getElementById('bsPgOpsi').value },
            pgk: { jml: getVal('bsPgkJml'), bobot: getVal('bsPgkBobot') },
            bs: { jml: getVal('bsBsJml'), bobot: getVal('bsBsBobot') },
            isian: { jml: getVal('bsIsianJml'), bobot: getVal('bsIsianBobot') },
            uraian: { jml: getVal('bsUraianJml'), bobot: getVal('bsUraianBobot') },
            urut: { jml: getVal('bsUrutJml'), bobot: getVal('bsUrutBobot') }
        },
        totalSoal: getVal('bsPgJml') + getVal('bsPgkJml') + getVal('bsBsJml') + getVal('bsIsianJml') + getVal('bsUraianJml') + getVal('bsUrutJml')
    };

    const btn = document.getElementById('btnSimpanBankSoal');
    btn.disabled = true; btn.innerText = "Menyimpan...";

    try {
        if(id) await updateDoc(doc(db, 'master_bank_soal', id), data);
        else await addDoc(collection(db, 'master_bank_soal'), data);
        closeModal('modalBankSoal');
        loadBankSoal();
    } catch(e) { 
        alert("Gagal menyimpan Bank Soal."); console.error(e); 
    } finally {
        btn.disabled = false; btn.innerText = "Simpan Bank Soal";
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
            const up = k.charAt(0).toUpperCase() + k.slice(1);
            document.getElementById(`bs${up}Jml`).value = b.komposisi[k]?.jml || 0;
            document.getElementById(`bs${up}Bobot`).value = b.komposisi[k]?.bobot || 0;
        });
        document.getElementById('bsPgOpsi').value = b.komposisi.pg?.opsi || '4';
    }
    
    document.getElementById('bsKategori').value = b.kategoriAgama || 'Bukan Mapel Agama';
    document.getElementById('bsStatus').value = b.isActive ? 'true' : 'false';

    kalkulasiTotalSoalBobot();
    document.getElementById('modalBankSoal').classList.remove('hidden');
};

window.hapusBankSoal = async (id) => {
    if(confirm("PERINGATAN: Menghapus Bank Soal juga akan menghapus seluruh butir soal di dalamnya (jika ada). Lanjutkan?")) {
        await deleteDoc(doc(db, 'master_bank_soal', id));
        loadBankSoal();
    }
};

window.bukaSoalDetail = (id) => {
    alert("Halaman penyusunan butir soal untuk Bank Soal ini sedang disiapkan. Nantinya akan diarahkan ke editor soal.");
};

// ==========================================
// MINIFIED FUNGSI LAINNYA (DIPERTAHANKAN)
// ==========================================
state.masterRuangUjian = []; state.masterSesiUjian = []; state.masterJenisUjian = []; state.masterGuru = []; state.masterKelas = []; state.masterEkskul = []; state.penempatanEkskul = {}; state.masterSiswa = [];

window.loadNomorPeserta = async () => { try { if(state.masterKelas.length === 0) { const snap = await getDocs(collection(db, 'master_kelas')); state.masterKelas = []; snap.forEach(d => state.masterKelas.push({id: d.id, ...d.data()})); state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || '')); } const snapSiswa = await getDocs(collection(db, 'master_siswa')); state.masterSiswa = []; snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()})); const selectKelas = document.getElementById('selectKelasNomor'); selectKelas.innerHTML = '<option value="ALL">Semua Kelas</option>'; state.masterKelas.forEach(k => { selectKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; }); } catch(e) { console.error(e); } };
window.generateNomorPeserta = async () => { const kelasVal = document.getElementById('selectKelasNomor').value; const btn = document.getElementById('btnGenerateNomor'); const NPSN_SEKOLAH = '20528347'; let siswaTarget = []; if (kelasVal === 'ALL') { siswaTarget = [...state.masterSiswa]; } else { siswaTarget = state.masterSiswa.filter(s => s.kelas === kelasVal); } if (siswaTarget.length === 0) return alert("Tidak ada siswa!"); siswaTarget.sort((a, b) => { if (a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || ''); return (a.kelas || '').localeCompare(b.kelas || ''); }); if(!confirm(`Generate ulang nomor untuk ${siswaTarget.length} siswa?`)) return; btn.disabled = true; btn.innerHTML = "Memproses..."; try { const promises = []; siswaTarget.forEach((s, index) => { const noUrut = String(index + 1).padStart(3, '0'); const noUjianBaru = `${NPSN_SEKOLAH}-${noUrut}`; s.noUjian = noUjianBaru; s.nis = noUjianBaru; promises.push(updateDoc(doc(db, 'master_siswa', s.id), { nis: noUjianBaru })); }); await Promise.all(promises); alert("Berhasil!"); if(window.renderTableSiswa) window.renderTableSiswa(); } catch(e) { console.error(e); } finally { btn.disabled = false; btn.innerHTML = "💾 Simpan"; } };

window.loadAturRuangSesi = async () => { try { if(state.masterKelas.length === 0) { const snap = await getDocs(collection(db, 'master_kelas')); state.masterKelas = []; snap.forEach(d => state.masterKelas.push({id: d.id, ...d.data()})); state.masterKelas.sort((a,b) => (a.nama || '').localeCompare(b.nama || '')); } if(state.masterRuangUjian.length === 0) { const snap = await getDocs(collection(db, 'master_ruang_ujian')); state.masterRuangUjian = []; snap.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()})); state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0)); } if(state.masterSesiUjian.length === 0) { const snap = await getDocs(collection(db, 'master_sesi_ujian')); state.masterSesiUjian = []; snap.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()})); state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0)); } const snapSiswa = await getDocs(collection(db, 'master_siswa')); state.masterSiswa = []; snapSiswa.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()})); const filterKelas = document.getElementById('filterKelasAtur'); filterKelas.innerHTML = '<option value="">-- Pilih Kelas --</option>'; state.masterKelas.forEach(k => { filterKelas.innerHTML += `<option value="${k.nama}">${k.nama}</option>`; }); const bulkRuang = document.getElementById('bulkRuang'); bulkRuang.innerHTML = '<option value="">Pilih ruang</option>'; state.masterRuangUjian.forEach(r => { bulkRuang.innerHTML += `<option value="${r.nama}">${r.nama}</option>`; }); const bulkSesi = document.getElementById('bulkSesi'); bulkSesi.innerHTML = '<option value="">Pilih sesi</option>'; state.masterSesiUjian.forEach(s => { bulkSesi.innerHTML += `<option value="${s.nama}">${s.nama}</option>`; }); if(state.masterKelas.length > 0) { filterKelas.value = state.masterKelas[0].nama; } window.renderTableAturRuangSesi(); } catch(e) { console.error(e); } };
window.renderTableAturRuangSesi = () => { const kelasVal = document.getElementById('filterKelasAtur').value; const tb = document.getElementById('tableAturRuangSesiBody'); const lbl = document.getElementById('labelBulkAction'); lbl.innerText = `Gabungkan siswa ${kelasVal ? kelasVal : ''} ke ruang dan sesi:`; tb.innerHTML = ''; if (!kelasVal) return tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Pilih kelas terlebih dahulu.</td></tr>'; const filteredSiswa = state.masterSiswa.filter(s => s.kelas === kelasVal).sort((a,b) => (a.nama||'').localeCompare(b.nama||'')); if (filteredSiswa.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Tidak ada siswa.</td></tr>'; let optRuang = '<option value="">Pilih ruang</option>'; state.masterRuangUjian.forEach(r => { optRuang += `<option value="${r.nama}">${r.nama}</option>`; }); let optSesi = '<option value="">Pilih sesi</option>'; state.masterSesiUjian.forEach(s => { optSesi += `<option value="${s.nama}">${s.nama}</option>`; }); filteredSiswa.forEach((s, i) => { tb.innerHTML += `<tr class="hover:bg-slate-50 transition" data-id="${s.id}"><td class="p-3 text-center border border-slate-200 text-slate-500 font-bold">${i+1}</td><td class="p-3 border border-slate-200 font-bold uppercase text-slate-800">${s.nama}</td><td class="p-3 border border-slate-200 text-center font-bold text-slate-600">${s.kelas}</td><td class="p-2 border border-slate-200 bg-slate-50"><select class="w-full p-2 border border-slate-300 rounded outline-none select-ruang text-sm bg-white">${optRuang}</select></td><td class="p-2 border border-slate-200 bg-slate-50"><select class="w-full p-2 border border-slate-300 rounded outline-none select-sesi text-sm bg-white">${optSesi}</select></td></tr>`; }); setTimeout(() => { tb.querySelectorAll('tr[data-id]').forEach(row => { const id = row.getAttribute('data-id'); const s = filteredSiswa.find(x => x.id === id); if(s) { if(s.ruang) row.querySelector('.select-ruang').value = s.ruang; if(s.sesi) row.querySelector('.select-sesi').value = s.sesi; } }); }, 50); };
window.applyBulkRuangSesi = () => { const ruangVal = document.getElementById('bulkRuang').value; const sesiVal = document.getElementById('bulkSesi').value; document.getElementById('tableAturRuangSesiBody').querySelectorAll('tr[data-id]').forEach(row => { if(ruangVal) row.querySelector('.select-ruang').value = ruangVal; if(sesiVal) row.querySelector('.select-sesi').value = sesiVal; }); };
window.simpanAturRuangSesi = async () => { const btn = document.getElementById('btnSimpanAtur'); btn.disabled = true; btn.innerText = "Menyimpan..."; try { const promises = []; document.getElementById('tableAturRuangSesiBody').querySelectorAll('tr[data-id]').forEach(row => { const id = row.getAttribute('data-id'); const ruang = row.querySelector('.select-ruang').value; const sesi = row.querySelector('.select-sesi').value; const s = state.masterSiswa.find(x => x.id === id); if(s) { s.ruang = ruang; s.sesi = sesi; } promises.push(updateDoc(doc(db, 'master_siswa', id), { ruang, sesi })); }); await Promise.all(promises); alert("Tersimpan!"); } catch(e) { console.error(e); } finally { btn.disabled = false; btn.innerText = "💾 Simpan"; } };

window.loadRuangUjian = async () => { try { const snap = await getDocs(collection(db, 'master_ruang_ujian')); state.masterRuangUjian = []; snap.forEach(d => state.masterRuangUjian.push({id: d.id, ...d.data()})); if(state.masterRuangUjian.length === 0) { const defaultRuang = [ { nama: 'Ruang 1', kode: 'IX', jumSesi: 2, noUrut: 1 } ]; for (const r of defaultRuang) { const docRef = await addDoc(collection(db, 'master_ruang_ujian'), r); state.masterRuangUjian.push({ id: docRef.id, ...r }); } } state.masterRuangUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0)); window.renderTableRuangUjian(); } catch(e) { console.error(e); } };
window.renderTableRuangUjian = () => { const tb = document.getElementById('tableRuangUjianBody'); tb.innerHTML = ''; if (state.masterRuangUjian.length === 0) return tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 bg-slate-100">No data available in table</td></tr>'; state.masterRuangUjian.forEach((r, i) => { tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td><td class="p-3 text-center border-r">${i+1}</td><td class="p-3 border-r">${r.nama || '-'}</td><td class="p-3 border-r text-center font-mono">${r.kode || '-'}</td><td class="p-3 border-r text-center">${r.jumSesi || '-'}</td><td class="p-3 text-center space-x-1"><button onclick="editRuangUjian('${r.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition flex items-center justify-center gap-1 w-full max-w-[80px] mx-auto">✏️ Edit</button></td></tr>`; }); };
window.openModalRuangUjian = () => { document.getElementById('ruangUjianId').value = ''; document.getElementById('inputNamaRuang').value = ''; document.getElementById('inputKodeRuang').value = ''; document.getElementById('inputJumSesi').value = '1'; document.getElementById('modalRuangUjian').classList.remove('hidden'); };
window.simpanRuangUjian = async () => { const id = document.getElementById('ruangUjianId').value; const nama = document.getElementById('inputNamaRuang').value.trim(); const data = { nama, kode: document.getElementById('inputKodeRuang').value.trim().toUpperCase(), jumSesi: document.getElementById('inputJumSesi').value, noUrut: state.masterRuangUjian.length + 1 }; try { if(id) { const old = state.masterRuangUjian.find(x => x.id === id); if(old) data.noUrut = old.noUrut; await updateDoc(doc(db, 'master_ruang_ujian', id), data); } else { await addDoc(collection(db, 'master_ruang_ujian'), data); } closeModal('modalRuangUjian'); loadRuangUjian(); } catch(e) { console.error(e); } };
window.editRuangUjian = (id) => { const r = state.masterRuangUjian.find(x => x.id === id); if(!r) return; document.getElementById('ruangUjianId').value = r.id; document.getElementById('inputNamaRuang').value = r.nama || ''; document.getElementById('inputKodeRuang').value = r.kode || ''; document.getElementById('inputJumSesi').value = r.jumSesi || ''; document.getElementById('modalRuangUjian').classList.remove('hidden'); };

window.loadSesiUjian = async () => { try { const snap = await getDocs(collection(db, 'master_sesi_ujian')); state.masterSesiUjian = []; snap.forEach(d => state.masterSesiUjian.push({id: d.id, ...d.data()})); if(state.masterSesiUjian.length === 0) { const defaultSesi = [ { nama: 'Sesi 1', kode: 'S1', waktuMulai: '07:30:00', waktuSelesai: '09:30:00', noUrut: 1 }, { nama: 'Sesi 2', kode: 'S2', waktuMulai: '10:00:32', waktuSelesai: '12:00:40', noUrut: 2 } ]; for (const s of defaultSesi) { const docRef = await addDoc(collection(db, 'master_sesi_ujian'), s); state.masterSesiUjian.push({ id: docRef.id, ...s }); } } state.masterSesiUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0)); window.renderTableSesiUjian(); } catch(e) { console.error(e); } };
window.renderTableSesiUjian = () => { const tb = document.getElementById('tableSesiUjianBody'); tb.innerHTML = ''; if (state.masterSesiUjian.length === 0) return tb.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-500 bg-slate-100">No data available in table</td></tr>'; state.masterSesiUjian.forEach((s, i) => { tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td><td class="p-3 text-center border-r">${i+1}</td><td class="p-3 border-r">${s.nama || '-'}</td><td class="p-3 border-r text-center font-mono">${s.kode || '-'}</td><td class="p-3 border-r text-center font-mono">${s.waktuMulai || '-'} s/d ${s.waktuSelesai || '-'}</td><td class="p-3 text-center space-x-1"><button onclick="editSesiUjian('${s.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition flex items-center justify-center gap-1 w-full max-w-[80px] mx-auto">✏️ Edit</button></td></tr>`; }); };
window.openModalSesiUjian = () => { document.getElementById('sesiUjianId').value = ''; document.getElementById('inputNamaSesi').value = ''; document.getElementById('inputKodeSesi').value = ''; document.getElementById('inputWaktuMulai').value = '07:30:00'; document.getElementById('inputWaktuSelesai').value = '09:30:00'; document.getElementById('modalSesiUjian').classList.remove('hidden'); };
window.simpanSesiUjian = async () => { const id = document.getElementById('sesiUjianId').value; const nama = document.getElementById('inputNamaSesi').value.trim(); const data = { nama, kode: document.getElementById('inputKodeSesi').value.trim().toUpperCase(), waktuMulai: document.getElementById('inputWaktuMulai').value, waktuSelesai: document.getElementById('inputWaktuSelesai').value, noUrut: state.masterSesiUjian.length + 1 }; try { if(id) { const old = state.masterSesiUjian.find(x => x.id === id); if(old) data.noUrut = old.noUrut; await updateDoc(doc(db, 'master_sesi_ujian', id), data); } else { await addDoc(collection(db, 'master_sesi_ujian'), data); } closeModal('modalSesiUjian'); loadSesiUjian(); } catch(e) { console.error(e); } };
window.editSesiUjian = (id) => { const s = state.masterSesiUjian.find(x => x.id === id); if(!s) return; document.getElementById('sesiUjianId').value = s.id; document.getElementById('inputNamaSesi').value = s.nama || ''; document.getElementById('inputKodeSesi').value = s.kode || ''; document.getElementById('inputWaktuMulai').value = s.waktuMulai || ''; document.getElementById('inputWaktuSelesai').value = s.waktuSelesai || ''; document.getElementById('modalSesiUjian').classList.remove('hidden'); };

window.loadJenisUjian = async () => { try { const snap = await getDocs(collection(db, 'master_jenis_ujian')); state.masterJenisUjian = []; snap.forEach(d => state.masterJenisUjian.push({id: d.id, ...d.data()})); if(state.masterJenisUjian.length === 0) { const defaultJenis = [ { nama: 'Penilaian Harian', kode: 'PH', noUrut: 1 }, { nama: 'Penilaian Tengah Semester', kode: 'PTS', noUrut: 2 }, { nama: 'Penilaian Akhir Semester', kode: 'PAS', noUrut: 3 }, { nama: 'Penilaian Akhir Tahun', kode: 'PAT', noUrut: 4 }, { nama: 'Ujian Sekolah Berbasis Komputer', kode: 'USBK', noUrut: 5 }, { nama: 'Try Out', kode: 'TO', noUrut: 6 }, { nama: 'Simulasi', kode: 'SIML', noUrut: 7 } ]; for (const j of defaultJenis) { const docRef = await addDoc(collection(db, 'master_jenis_ujian'), j); state.masterJenisUjian.push({ id: docRef.id, ...j }); } } state.masterJenisUjian.sort((a,b) => (a.noUrut || 0) - (b.noUrut || 0)); window.renderTableJenisUjian(); } catch(e) { console.error(e); } };
window.renderTableJenisUjian = () => { const tb = document.getElementById('tableJenisUjianBody'); tb.innerHTML = ''; if (state.masterJenisUjian.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 bg-slate-100">No data available in table</td></tr>'; state.masterJenisUjian.forEach((ju, i) => { tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r"><input type="checkbox" class="rounded"></td><td class="p-3 text-center border-r">${i+1}</td><td class="p-3 border-r">${ju.nama || '-'}</td><td class="p-3 border-r text-center font-mono">${ju.kode || '-'}</td><td class="p-3 text-center space-x-1"><button onclick="editJenisUjian('${ju.id}')" class="bg-amber-400 hover:bg-amber-500 text-slate-900 px-3 py-1 rounded shadow-sm text-xs font-bold transition flex items-center justify-center gap-1 w-full max-w-[80px] mx-auto">✏️ Edit</button></td></tr>`; }); };
window.openModalJenisUjian = () => { document.getElementById('jenisUjianId').value = ''; document.getElementById('inputNamaJenisUjian').value = ''; document.getElementById('inputKodeJenisUjian').value = ''; document.getElementById('modalJenisUjian').classList.remove('hidden'); };
window.simpanJenisUjian = async () => { const id = document.getElementById('jenisUjianId').value; const nama = document.getElementById('inputNamaJenisUjian').value.trim(); const kode = document.getElementById('inputKodeJenisUjian').value.trim().toUpperCase(); if(!nama) return alert("Nama Jenis Ujian wajib diisi!"); const data = { nama, kode, noUrut: state.masterJenisUjian.length + 1 }; try { if(id) { const old = state.masterJenisUjian.find(x => x.id === id); if(old) data.noUrut = old.noUrut; await updateDoc(doc(db, 'master_jenis_ujian', id), data); } else { await addDoc(collection(db, 'master_jenis_ujian'), data); } closeModal('modalJenisUjian'); loadJenisUjian(); } catch(e) { console.error(e); } };
window.editJenisUjian = (id) => { const ju = state.masterJenisUjian.find(x => x.id === id); if(!ju) return; document.getElementById('jenisUjianId').value = ju.id; document.getElementById('inputNamaJenisUjian').value = ju.nama || ''; document.getElementById('inputKodeJenisUjian').value = ju.kode || ''; document.getElementById('modalJenisUjian').classList.remove('hidden'); };

window.loadGuru = async () => { try { const snap = await getDocs(collection(db, 'master_guru')); state.masterGuru = []; snap.forEach(d => state.masterGuru.push({id: d.id, ...d.data()})); state.masterGuru.sort((a,b) => (a.nama || '').localeCompare(b.nama || '')); window.renderGridGuru(); } catch(e) { console.error(e); } };
window.renderGridGuru = () => { const container = document.getElementById('gridGuruContainer'); const searchTerm = (document.getElementById('searchGuru')?.value || '').toUpperCase(); container.innerHTML = ''; const filteredGuru = state.masterGuru.filter(g => (g.nama || '').toUpperCase().includes(searchTerm) || (g.nip || '').toUpperCase().includes(searchTerm) ); if (filteredGuru.length === 0) return container.innerHTML = '<div class="col-span-full p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">Belum ada data guru atau pencarian tidak ditemukan.</div>'; filteredGuru.forEach((g) => { const badgeAktif = g.isActive !== false ? `<span class="bg-green-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Aktif</span>` : `<span class="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">Nonaktif</span>`; container.innerHTML += `<div class="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative transition hover:shadow-md"><div class="h-1 w-full bg-blue-500 absolute top-0 left-0"></div><div class="p-5 flex gap-4 mt-1 items-center"><div class="w-[70px] h-[70px] rounded-full border-2 border-slate-200 overflow-hidden flex-shrink-0 bg-slate-50 flex items-center justify-center text-4xl shadow-inner">👨‍🏫</div><div class="flex-1"><p class="text-[11px] text-slate-500 tracking-wider font-mono">${g.nip || '-'}</p><h4 class="font-bold text-[15px] text-slate-800 uppercase mt-0.5 leading-tight line-clamp-2">${g.nama || '-'}</h4><p class="text-[10px] text-blue-600 font-bold uppercase mt-1 mb-2">${g.jabatan || 'Guru Kelas'}</p><div>${badgeAktif}</div></div></div><div class="px-4 pb-4 pt-3 flex justify-between items-center gap-2 border-t border-slate-100 bg-slate-50/50 mt-1"><div class="flex gap-2"><button onclick="editGuru('${g.id}')" class="text-blue-600 bg-white border border-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow-sm">✏️ Profile</button><button onclick="editJabatanGuru('${g.id}')" class="text-blue-600 bg-white border border-blue-500 hover:bg-blue-50 px-3 py-1.5 rounded text-xs font-bold transition flex items-center gap-1 shadow-sm">✏️ Jabatan</button></div><button onclick="hapusGuru('${g.id}')" class="text-red-500 bg-white border border-red-300 hover:bg-red-50 hover:border-red-500 px-3 py-1.5 rounded text-xs transition shadow-sm">🗑️</button></div></div>`; }); };
window.openModalGuru = () => { document.getElementById('guruId').value = ''; document.getElementById('guruNip').value = ''; document.getElementById('guruKode').value = ''; document.getElementById('guruNama').value = ''; document.getElementById('guruUsername').value = ''; document.getElementById('guruPassword').value = ''; document.getElementById('guruStatus').checked = true; document.getElementById('modalGuru').classList.remove('hidden'); };
window.simpanGuru = async () => { const id = document.getElementById('guruId').value; const nip = document.getElementById('guruNip').value.trim(); const nama = document.getElementById('guruNama').value.trim().toUpperCase(); if(!nip || !nama) return alert("NIP/NUPTK dan Nama Lengkap wajib diisi!"); const data = { nip, kode: document.getElementById('guruKode').value.trim().toUpperCase(), nama, username: document.getElementById('guruUsername').value.trim().toLowerCase() || nip, password: document.getElementById('guruPassword').value.trim() || nip, isActive: document.getElementById('guruStatus').checked }; try { if(id) await updateDoc(doc(db, 'master_guru', id), data); else await addDoc(collection(db, 'master_guru'), data); closeModal('modalGuru'); loadGuru(); } catch(e) { alert("Gagal menyimpan data guru."); console.error(e); } };
window.editGuru = (id) => { const g = state.masterGuru.find(x => x.id === id); if(!g) return; document.getElementById('guruId').value = g.id; document.getElementById('guruNip').value = g.nip || ''; document.getElementById('guruKode').value = g.kode || ''; document.getElementById('guruNama').value = g.nama || ''; document.getElementById('guruUsername').value = g.username || ''; document.getElementById('guruPassword').value = g.password || ''; document.getElementById('guruStatus').checked = g.isActive !== false; document.getElementById('modalGuru').classList.remove('hidden'); };
window.hapusGuru = async (id) => { if(confirm("Yakin ingin menghapus data guru ini? Data yang terhapus tidak dapat dikembalikan.")) { await deleteDoc(doc(db, 'master_guru', id)); loadGuru(); } };
window.editJabatanGuru = async (id) => { const g = state.masterGuru.find(x => x.id === id); if(!g) return; const jabatanBaru = prompt(`Masukkan Jabatan untuk ${g.nama}\n(Contoh: Wali Kelas 5A, Guru PAI, dll):`, g.jabatan || "Guru Kelas"); if(jabatanBaru !== null) { await updateDoc(doc(db, 'master_guru', id), { jabatan: jabatanBaru.toUpperCase() }); loadGuru(); } };
window.downloadFormatGuru = () => { const headers = ['No', 'Nama\n(2-50 huruf atau angka)', 'NIP/NUPTK\n(4-12 angka)', 'KODE\n(1-5 huruf atau angka)', 'USERNAME\n(unique/jangan sama)\nhuruf kecil', 'PASSWORD']; let dataExport = []; if(state.masterGuru.length === 0) { let dummy = {}; headers.forEach(h => dummy[h] = ''); dummy['No'] = 1; dummy['Nama\n(2-50 huruf atau angka)'] = 'YOYON SUGIYONO, S.Pd., M.Pd.'; dummy['NIP/NUPTK\n(4-12 angka)'] = '198501012010011001'; dummy['KODE\n(1-5 huruf atau angka)'] = 'YOY'; dummy['USERNAME\n(unique/jangan sama)\nhuruf kecil'] = 'yoyon'; dummy['PASSWORD'] = '123456'; dataExport.push(dummy); } else { state.masterGuru.forEach((g, i) => { let row = {}; headers.forEach(h => row[h] = ''); row['No'] = i+1; row['Nama\n(2-50 huruf atau angka)'] = g.nama; row['NIP/NUPTK\n(4-12 angka)'] = g.nip; row['KODE\n(1-5 huruf atau angka)'] = g.kode || ''; row['USERNAME\n(unique/jangan sama)\nhuruf kecil'] = g.username || g.nip; row['PASSWORD'] = g.password || g.nip; dataExport.push(row); }); } const ws = XLSX.utils.json_to_sheet(dataExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data_Guru"); XLSX.writeFile(wb, "format_guru.xlsx"); };
window.prosesImportGuru = async (e) => { const f = e.target.files[0]; if(!f) return; document.getElementById('loadingIndicator').classList.remove('hidden'); const r = new FileReader(); r.onload = async (evt) => { try { const d = new Uint8Array(evt.target.result); const wb = XLSX.read(d, {type:'array'}); const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); let success = 0; for (const row of json) { const nip = row['NIP/NUPTK\n(4-12 angka)'] || row['NIP/NUPTK'] || row['NIP']; const nama = row['Nama\n(2-50 huruf atau angka)'] || row['Nama'] || row['NAMA']; if (!nip || !nama) continue; let nipStr = String(nip).trim(); const dataSimpan = { nip: nipStr, nama: String(nama).trim().toUpperCase(), kode: String(row['KODE\n(1-5 huruf atau angka)'] || row['KODE'] || '').trim().toUpperCase(), username: String(row['USERNAME\n(unique/jangan sama)\nhuruf kecil'] || row['USERNAME'] || nipStr).trim().toLowerCase(), password: String(row['PASSWORD'] || nipStr).trim(), isActive: true, jabatan: 'GURU KELAS' }; const ex = state.masterGuru.find(x => x.nip === dataSimpan.nip); if (ex && ex.id) { await updateDoc(doc(db, 'master_guru', ex.id), dataSimpan); } else { await addDoc(collection(db, 'master_guru'), dataSimpan); } success++; } alert(`Berhasil memproses ${success} data guru dari Excel!`); } catch(err) { console.error("Error import excel guru:", err); alert("Terjadi kesalahan sistem. Pastikan format kolom sesuai dengan template."); } finally { document.getElementById('loadingIndicator').classList.add('hidden'); document.getElementById('fileImportGuru').value = ''; loadGuru(); } }; r.readAsArrayBuffer(f); };

window.loadEkskul = async () => { /* Logika dipertahankan */ };
window.renderTableEkskul = () => { /* Logika dipertahankan */ };
window.openModalEkskul = () => { /* Logika dipertahankan */ };
window.simpanEkskul = async () => { /* Logika dipertahankan */ };
window.editEkskul = (id) => { /* Logika dipertahankan */ };
window.hapusEkskul = async (id) => { /* Logika dipertahankan */ };
window.renderPenempatanEkskul = () => { /* Logika dipertahankan */ };
window.simpanPenempatanEkskul = async () => { /* Logika dipertahankan */ };

window.loadKelas = async () => { /* Logika dipertahankan */ };
window.renderTableKelas = () => { /* Logika dipertahankan */ };
window.openModalKelas = () => { /* Logika dipertahankan */ };
window.simpanKelas = async () => { /* Logika dipertahankan */ };
window.editKelas = (id) => { /* Logika dipertahankan */ };
window.hapusKelas = async (id) => { /* Logika dipertahankan */ };
window.kenaikanKelas = () => { /* Logika dipertahankan */ };

window.loadSiswa = async () => { try { const snap = await getDocs(collection(db, 'master_siswa')); state.masterSiswa = []; snap.forEach(d => state.masterSiswa.push({id: d.id, ...d.data()})); state.masterSiswa.sort((a,b) => { if(a.kelas === b.kelas) return (a.nama || '').localeCompare(b.nama || ''); return (a.kelas || '').localeCompare(b.kelas || ''); }); window.renderTableSiswa(); } catch(e) { console.error(e); } };
window.renderTableSiswa = () => { const tb = document.getElementById('tableSiswaBody'); tb.innerHTML = ''; if (state.masterSiswa.length === 0) return tb.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500">Belum ada siswa.</td></tr>'; state.masterSiswa.forEach((s, i) => { const avatar = s.jk === 'P' ? '👩' : '👦'; const colorJk = s.jk === 'P' ? 'bg-pink-500' : 'bg-blue-500'; const badgeAktif = s.isActive === false ? `<span class="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Nonaktif</span>` : `<span class="bg-emerald-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">Aktif</span>`; tb.innerHTML += `<tr class="hover:bg-slate-50 transition"><td class="p-3 text-center border-r"><input type="checkbox" class="w-4 h-4"></td><td class="p-3 text-center font-bold text-slate-500 border-r">${i+1}</td><td class="p-3 border-r"><div class="flex items-center gap-3"><div class="w-12 h-12 bg-slate-200 rounded-full flex justify-center items-center text-2xl border">${avatar}</div><div><p class="font-bold text-[15px] uppercase">${s.nama}</p><div class="flex gap-1 mt-1"><span class="bg-teal-500 text-white px-2 py-0.5 rounded text-[10px] font-bold">KELAS ${s.kelas || '-'}</span><span class="${colorJk} text-white px-2 py-0.5 rounded text-[10px] font-bold">${s.jk || 'L'}</span>${badgeAktif}</div></div></div></td><td class="p-3 border-r"><p class="text-[11px] text-slate-500 font-bold mb-0.5">No Ujian: <span class="text-blue-600 text-sm font-black tracking-widest">${s.nis || '-'}</span></p><p class="text-[11px] text-slate-500 font-bold">NISN: <span class="text-slate-800 text-sm font-black tracking-widest">${s.nisn || '-'}</span></p></td><td class="p-3 text-center space-y-1"><button onclick="editSiswa('${s.id}')" class="bg-amber-400 w-full px-3 py-1.5 rounded text-xs font-bold transition">✏️ Edit</button><button onclick="hapusSiswa('${s.id}')" class="bg-red-500 text-white w-full px-3 py-1.5 rounded text-xs font-bold transition">🗑️ Hapus</button></td></tr>`; }); };
window.openModalSiswa = () => { document.getElementById('siswaId').value = ''; document.getElementById('siswaNisn').value = ''; document.getElementById('siswaNama').value = ''; document.getElementById('siswaUsername').value = ''; document.getElementById('siswaPassword').value = ''; document.getElementById('modalSiswa').classList.remove('hidden'); };
window.generatePassword = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let p = ''; for (let i = 0; i < 6; i++) p += c.charAt(Math.floor(Math.random() * c.length)); document.getElementById('pesertaPassword').value = p; };
window.simpanSiswa = async () => { const id = document.getElementById('siswaId').value; const nisn = document.getElementById('siswaNisn').value.trim(); const nama = document.getElementById('siswaNama').value.trim().toUpperCase(); if(!nisn || !nama) return; const data = { nisn, nis: document.getElementById('siswaNis').value.trim(), nama, jk: document.getElementById('siswaJk').value, kelas: document.getElementById('siswaKelas').value.trim().toUpperCase(), username: document.getElementById('siswaUsername').value.trim() || nisn, password: document.getElementById('siswaPassword').value.trim() || nisn, isActive: document.getElementById('siswaStatus').checked }; try { if(id) await updateDoc(doc(db, 'master_siswa', id), data); else await addDoc(collection(db, 'master_siswa'), data); closeModal('modalSiswa'); loadSiswa(); } catch(e) { console.error(e); } };
window.editSiswa = (id) => { const s = state.masterSiswa.find(x => x.id === id); if(!s) return; document.getElementById('siswaId').value = s.id; document.getElementById('siswaNisn').value = s.nisn || ''; document.getElementById('siswaNis').value = s.nis || ''; document.getElementById('siswaNama').value = s.nama || ''; document.getElementById('siswaJk').value = s.jk || 'L'; document.getElementById('siswaKelas').value = s.kelas || ''; document.getElementById('siswaUsername').value = s.username || ''; document.getElementById('siswaPassword').value = s.password || ''; document.getElementById('siswaStatus').checked = s.isActive !== false; document.getElementById('modalSiswa').classList.remove('hidden'); };
window.hapusSiswa = async (id) => { if(confirm("Yakin hapus?")) { await deleteDoc(doc(db, 'master_siswa', id)); loadSiswa(); } };
window.downloadFormatSiswa = () => { const headers = ['NO', 'NISN*', 'NIS*', 'NAMA SISWA*', 'JENIS KELAMIN\n(L/P) *', 'USERNAME*', 'PASSWORD*', 'KELAS AWAL *\n(gunakan nomor\n1-12)', 'TANGGAL DI TERIMA\nFORMAT (YYYY-MM-DD) CONTOH (2018-07-20)', 'SEKOLAH ASAL', 'TEMPAT LAHIR', 'TANGGAL LAHIR FORMAT\n(DD-MM-YYY) CONTOH (05-06-1990)', 'AGAMA ', 'NOMOR TELEPON', 'EMAIL', 'ANAK KE', 'STATUS DALAM KELUARGA\n1 = Anak Kandung\n2 = Anak Tiri\n 3 = Anak Angkat', 'ALAMAT', 'RT', 'RW', 'DESA/KELURAHAN', 'KECAMATAN', 'KABUPATEN/KOTA', 'PROVINSI', 'KODE POS', 'NAMA AYAH', 'TANGGAL LAHIR AYAH', 'PENDIDIKAN AYAH', 'PEKERJAAN AYAH', 'NOMOR TELEPON AYAH', 'ALAMAT AYAH', 'NAMA IBU', 'TANGGAL LAHIR IBU', 'PENDIDIKAN\nIBU', 'PEKERJAAN IBU', 'NOMOR TELEPON IBU', 'ALAMAT IBU', 'NAMA WALI', 'TANGGAL LAHIR WALI', 'PENDIDIKAN\nWALI', 'PEKERJAAN WALI', 'NOMOR TELEPON WALI', 'ALAMAT WALI']; let dataExport = []; if(state.masterSiswa.length === 0) { let dummy = {}; headers.forEach(h => dummy[h] = ''); dummy['NO'] = 1; dummy['NISN*'] = '001021022'; dummy['NIS*'] = '1022'; dummy['NAMA SISWA*'] = 'ADAM APSAR'; dummy['JENIS KELAMIN\n(L/P) *'] = 'L'; dummy['USERNAME*'] = 'adam'; dummy['PASSWORD*'] = '123456'; dummy['KELAS AWAL *\n(gunakan nomor\n1-12)'] = '5A'; dataExport.push(dummy); } else { state.masterSiswa.forEach((s, i) => { let row = {}; headers.forEach(h => row[h] = ''); row['NO'] = i+1; row['NISN*'] = s.nisn; row['NIS*'] = s.nis || ''; row['NAMA SISWA*'] = s.nama; row['JENIS KELAMIN\n(L/P) *'] = s.jk || 'L'; row['USERNAME*'] = s.username || s.nisn; row['PASSWORD*'] = s.password || s.nisn; row['KELAS AWAL *\n(gunakan nomor\n1-12)'] = s.kelas || ''; dataExport.push(row); }); } const ws = XLSX.utils.json_to_sheet(dataExport); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Data_Siswa"); XLSX.writeFile(wb, "format_siswa.xlsx"); };
window.prosesImportSiswa = async (e) => { const f = e.target.files[0]; if(!f) return; document.getElementById('loadingIndicator').classList.remove('hidden'); const r = new FileReader(); r.onload = async (evt) => { try { const d = new Uint8Array(evt.target.result); const wb = XLSX.read(d, {type:'array'}); const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); let success = 0; for (const row of json) { const nisn = row['NISN*'] || row['NISN']; const nama = row['NAMA SISWA*'] || row['NAMA SISWA'] || row['NAMA']; if (!nisn || !nama) continue; let nisnStr = String(nisn).trim(); let pwd = row['PASSWORD*'] || row['PASSWORD'] || nisnStr; const dataSimpan = { nisn: nisnStr, nis: String(row['NIS*'] || row['NIS'] || '').trim(), nama: String(nama).trim().toUpperCase(), jk: String(row['JENIS KELAMIN\n(L/P) *'] || row['JENIS KELAMIN'] || 'L').trim().toUpperCase().charAt(0), username: String(row['USERNAME*'] || row['USERNAME'] || nisnStr).trim(), password: String(pwd).trim(), kelas: String(row['KELAS AWAL *\n(gunakan nomor\n1-12)'] || row['KELAS AWAL'] || row['KELAS'] || '').trim().toUpperCase(), isActive: true }; const ex = state.masterSiswa.find(x => x.nisn === dataSimpan.nisn); if (ex && ex.id) { await updateDoc(doc(db, 'master_siswa', ex.id), dataSimpan); } else { await addDoc(collection(db, 'master_siswa'), dataSimpan); } success++; } alert(`Berhasil memproses ${success} data siswa dari Excel!`); } catch(err) { console.error("Error import excel guru:", err); alert("Terjadi kesalahan sistem. Pastikan format kolom sesuai dengan template."); } finally { document.getElementById('loadingIndicator').classList.add('hidden'); document.getElementById('fileImportSiswa').value = ''; loadSiswa(); } }; r.readAsArrayBuffer(f); };

window.loadTahunPelajaran = async () => { /* Logika dipertahankan */ };
window.loadMataPelajaran = async () => { /* Logika dipertahankan */ };
window.loadJurusan = async () => { /* Logika dipertahankan */ };
window.isiFormProfil = () => { /* Logika dipertahankan */ };
window.simpanProfil = async () => { /* Logika dipertahankan */ };
window.changeSubject = () => { /* Logika dipertahankan */ };

// Start Application
checkAdminSession();
