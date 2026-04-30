import { state } from '../services/store.js';
import { db, doc, collection, addDoc, updateDoc, deleteDoc, setDoc, initFirebase } from '../services/api.js';

// ==========================================
// UTILS NAVIGASI & MODAL
// ==========================================
window.switchTab = (sectionId, title) => {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition";
    });

    const sectionTarget = document.getElementById(sectionId);
    if(sectionTarget) sectionTarget.classList.remove('hidden');
    
    const activeBtn = document.getElementById('btn-' + sectionId);
    if(activeBtn) activeBtn.className = "menu-btn w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600 text-white font-bold transition shadow-lg shadow-blue-900/50";
    
    if(title) {
        const titleEl = document.getElementById('pageTitle');
        if(titleEl) titleEl.innerText = title;
    }

    const sidebar = document.getElementById('sidebar');
    if(window.innerWidth < 768 && !sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.add('-translate-x-full');
    }
};

window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    if (sidebar.classList.contains('-translate-x-full')) sidebar.classList.remove('-translate-x-full');
    else sidebar.classList.add('-translate-x-full');
};

window.closeModal = (modalId) => {
    document.getElementById(modalId).classList.add('hidden');
};

// ==========================================
// LOGIN ADMIN & SESSION
// ==========================================
window.checkAdminSession = () => {
    // Cek apakah ada sesi admin yang tersimpan di browser
    const isLogged = sessionStorage.getItem('admin_logged_in');
    if (isLogged === 'true') {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('flex');
        initFirebase(); // Langsung tarik data dari Firebase
    }
};

window.handleLogin = (e) => {
    e.preventDefault();
    const inputPin = document.getElementById('inputPinAdmin').value;
    if (inputPin === state.ADMIN_PIN) {
        // Simpan tanda login berhasil ke sessionStorage
        sessionStorage.setItem('admin_logged_in', 'true');
        
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('appScreen').classList.remove('hidden');
        document.getElementById('appScreen').classList.add('flex');
        initFirebase(); 
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
};

window.logoutAdmin = () => {
    // Hapus sesi saat logout
    sessionStorage.removeItem('admin_logged_in');
    
    document.getElementById('inputPinAdmin').value = '';
    document.getElementById('loginError').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('flex');
};

// Jalankan pengecekan sesi secara otomatis saat file js dimuat
window.checkAdminSession();

// ==========================================
// PROFIL SEKOLAH
// ==========================================
window.isiFormProfil = () => {
    document.getElementById('profSekolah').value = state.schoolProfile.namaSekolah || '';
    document.getElementById('profAlamat').value = state.schoolProfile.alamat || '';
    document.getElementById('profEmail').value = state.schoolProfile.email || '';
    document.getElementById('profWebsite').value = state.schoolProfile.website || '';
    document.getElementById('profNamaUjian').value = state.schoolProfile.namaUjian || 'Penilaian Akhir Jenjang (PAJ)';
    document.getElementById('profKelas').value = state.schoolProfile.kelas || '';
    document.getElementById('profKepsek').value = state.schoolProfile.kepsek || '';
    document.getElementById('profNIP').value = state.schoolProfile.nipKepsek || '';
    document.getElementById('profPengawas').value = state.schoolProfile.pengawas || '';
    document.getElementById('profNIPPengawas').value = state.schoolProfile.nipPengawas || '';
    document.getElementById('profProktor').value = state.schoolProfile.proktor || '';
    document.getElementById('profTahun').value = state.schoolProfile.tahunAjaran || '';

    // Load preview Logo Kabupaten
    document.getElementById('logoKabBase64').value = state.schoolProfile.logoKab || '';
    const previewKab = document.getElementById('previewLogoKab');
    if(state.schoolProfile.logoKab) { 
        previewKab.src = state.schoolProfile.logoKab; 
        previewKab.classList.remove('hidden'); 
    } else { 
        previewKab.classList.add('hidden'); 
    }

    // Load preview Logo Sekolah
    document.getElementById('logoSekolahBase64').value = state.schoolProfile.logoSekolah || '';
    const previewSekolah = document.getElementById('previewLogoSekolah');
    if(state.schoolProfile.logoSekolah) { 
        previewSekolah.src = state.schoolProfile.logoSekolah; 
        previewSekolah.classList.remove('hidden'); 
    } else { 
        previewSekolah.classList.add('hidden'); 
    }

    // Trigger update UI Preview Kop
    if(window.updatePreviewKop) window.updatePreviewKop();
};

window.simpanProfil = async () => {
    const btn = document.getElementById('btnSimpanProfil');
    try {
        btn.disabled = true; btn.innerText = "Menyimpan...";
        const dataSimpan = {
            namaSekolah: document.getElementById('profSekolah').value.toUpperCase(),
            alamat: document.getElementById('profAlamat').value,
            email: document.getElementById('profEmail').value,
            website: document.getElementById('profWebsite').value,
            namaUjian: document.getElementById('profNamaUjian').value,
            kelas: document.getElementById('profKelas').value,
            kepsek: document.getElementById('profKepsek').value,
            nipKepsek: document.getElementById('profNIP').value,
            pengawas: document.getElementById('profPengawas').value,
            nipPengawas: document.getElementById('profNIPPengawas').value,
            proktor: document.getElementById('profProktor').value,
            tahunAjaran: document.getElementById('profTahun').value,
            logoKab: document.getElementById('logoKabBase64').value || null,
            logoSekolah: document.getElementById('logoSekolahBase64').value || null
        };
        await setDoc(doc(db, 'school_profile', 'main_profile'), dataSimpan, { merge: true });
        alert("Profil berhasil disimpan!");
    } catch (error) { 
        console.error(error); 
        alert("Gagal simpan profil.");
    } finally { 
        btn.disabled = false; 
        btn.innerText = "Simpan Profil"; 
    }
};

// ==========================================
// MATA PELAJARAN
// ==========================================
window.changeSubject = () => {
    state.currentSubject = document.getElementById('subjectSelector').value;
    document.getElementById('labelSubjectNilai').innerText = state.currentSubject;
    document.getElementById('labelSubjectSoal').innerText = state.currentSubject;
    document.getElementById('cetakMapelLabel').innerText = state.currentSubject;
    if(window.renderTableNilai) window.renderTableNilai();
    if(window.renderTableSoal) window.renderTableSoal();
};

window.tambahPelajaranBaru = () => {
    const baru = prompt("Masukkan nama Mata Pelajaran baru (Contoh: Bahasa Inggris):");
    if (baru && baru.trim() !== '') {
        state.allSubjectsSet.add(baru.trim());
        window.updateDropdownUI();
        document.getElementById('subjectSelector').value = baru.trim();
        window.changeSubject();
        if(window.renderTableUjian) window.renderTableUjian(); 
    }
};

window.updateSubjectDropdownDinamis = () => {
    state.allQuestions.forEach(q => { if(q.subject) state.allSubjectsSet.add(q.subject); });
    state.allResults.forEach(r => { if(r.subject) state.allSubjectsSet.add(r.subject); });
    window.updateDropdownUI(); 
    if(window.renderTableUjian) window.renderTableUjian();
};

window.updateDropdownUI = () => {
    const sel = document.getElementById('subjectSelector');
    const currentSelected = sel.value || state.currentSubject;
    sel.innerHTML = '';
    Array.from(state.allSubjectsSet).sort().forEach(sub => {
        const opt = document.createElement('option');
        opt.value = sub; opt.innerText = sub;
        sel.appendChild(opt);
    });
    if(state.allSubjectsSet.has(currentSelected)) { sel.value = currentSelected; } 
    else { sel.value = "Pendidikan Pancasila"; state.currentSubject = "Pendidikan Pancasila"; }
    document.getElementById('labelSubjectNilai').innerText = sel.value;
    document.getElementById('labelSubjectSoal').innerText = sel.value;
    document.getElementById('cetakMapelLabel').innerText = sel.value;
};

// ==========================================
// TABEL & RENDER NILAI
// ==========================================
window.renderTableNilai = () => {
    const filteredResults = state.allResults.filter(r => (r.subject || "Pendidikan Pancasila") === state.currentSubject);
    const tbody = document.getElementById('tableNilaiBody');
    document.getElementById('totalStudents').innerText = filteredResults.length;
    tbody.innerHTML = '';
    if(filteredResults.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada siswa yang mengumpulkan ujian.</td></tr>'; return;
    }
    filteredResults.forEach(res => {
        let timeStr = res.timestamp ? new Date(res.timestamp.seconds * 1000).toLocaleString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="p-4">${timeStr}</td><td class="p-4 font-bold text-slate-700">${res.absen || '-'}</td><td class="p-4 font-semibold text-slate-800 uppercase">${res.nama || 'Anonim'}</td><td class="p-4 text-center font-black text-blue-600 text-lg">${res.nilaiPG || 0}</td><td class="p-4 text-center"><button onclick="lihatDetailNilai('${res.id}')" class="bg-indigo-100 text-indigo-700 px-3 py-1 rounded font-bold">Lihat</button></td>`;
        tbody.appendChild(tr);
    });
};

window.lihatDetailNilai = (id) => {
    const res = state.allResults.find(r => r.id === id);
    if(!res) return;
    document.getElementById('detailNamaSiswa').innerText = res.nama;
    document.getElementById('detailAbsenSiswa').innerText = res.absen;
    document.getElementById('detailSkorSiswa').innerText = res.nilaiPG;
    const container = document.getElementById('detailJawabanContainer');
    container.innerHTML = `<h4 class="font-bold mb-3 border-b pb-2">Uraian (${res.subject || "Pendidikan Pancasila"}):</h4>`;
    let hasUraian = false; let urut = 1;
    if(res.tipeSoal && res.jawaban) {
        res.tipeSoal.forEach((tipe, index) => {
            if(tipe === 'URAIAN') {
                hasUraian = true;
                const jawab = res.jawaban[index] || '<span class="italic text-slate-400">(Tidak dijawab)</span>';
                container.innerHTML += `<div class="mb-4 bg-yellow-50 p-4 rounded border border-yellow-200"><p class="font-bold mb-2">Soal Uraian ${urut++}</p><p class="whitespace-pre-wrap">${jawab}</p></div>`;
            }
        });
    }
    if(!hasUraian) container.innerHTML += '<p class="text-slate-500 italic">Tidak ada jawaban uraian.</p>';
    if (window.MathJax) MathJax.typesetPromise([container]);
    document.getElementById('modalDetailNilai').classList.remove('hidden');
};

// ==========================================
// RENDER SOAL & EDITOR
// ==========================================
window.renderTableSoal = () => {
    const filteredQuestions = state.allQuestions.filter(q => (q.subject || "Pendidikan Pancasila") === state.currentSubject);
    const tbody = document.getElementById('tableSoalBody');
    tbody.innerHTML = '';
    if(filteredQuestions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Bank Soal <b>${state.currentSubject}</b> masih kosong.</td></tr>`; return;
    }
    let counter = 1;
    filteredQuestions.forEach((q) => {
        let badgeClass = 'bg-blue-100 text-blue-800'; let typeName = q.type;
        if(q.type === 'URAIAN') { badgeClass = 'bg-purple-100 text-purple-800'; }
        else if(q.type === 'PG_KOMPLEKS') { badgeClass = 'bg-indigo-100 text-indigo-800'; typeName = 'PG-K'; }
        else if(q.type === 'MENCOCOKKAN') { badgeClass = 'bg-cyan-100 text-cyan-800'; typeName = 'MATCH'; }
        else if(q.type === 'BENAR_SALAH') { badgeClass = 'bg-teal-100 text-teal-800'; typeName = 'B/S'; }
        else if(q.type === 'ISIAN') { badgeClass = 'bg-orange-100 text-orange-800'; typeName = 'ISI'; }
        else if(q.type === 'MENGURUTKAN') { badgeClass = 'bg-fuchsia-100 text-fuchsia-800'; typeName = 'URUT'; }
        
        let badge = `<span class="${badgeClass} px-2 py-1 rounded text-[10px] font-bold tracking-wider">${typeName}</span>`;
        let kunciInfo = q.ans || '<span class="text-slate-400 italic text-xs">-</span>';
        if(Array.isArray(q.ans)) kunciInfo = q.ans.join(', ');

        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="p-4 text-center font-bold text-slate-400">${counter++}</td><td class="p-4 text-center">${badge}</td><td class="p-4"><div class="line-clamp-2 text-sm">${q.qImg ? `🖼️ ` : ''}${q.q}</div></td><td class="p-4 text-center text-sm font-bold text-green-600">${kunciInfo}</td><td class="p-4 text-center space-x-2"><button onclick="hapusSoal('${q.id}')" class="text-red-500 hover:text-red-700 font-bold">Hapus</button></td>`;
        tbody.appendChild(tr);
    });
    if (window.MathJax) MathJax.typesetPromise([tbody]);
};

window.openSoalModal = () => {
    document.getElementById('formSoal').reset(); 
    document.getElementById('soalId').value = '';
    document.getElementById('modalSoalTitle').innerText = "Tambah Soal Baru";
    document.getElementById('modalSoalSubjectBadge').innerText = "Mata Pelajaran: " + state.currentSubject;
    document.getElementById('previewSoal').classList.add('hidden');
    document.getElementById('soalGambarBase64').value = '';
    window.toggleFormSoalType(); 
    document.getElementById('modalFormSoal').classList.remove('hidden');
};

window.toggleFormSoalType = () => {
    const tipe = document.getElementById('soalTipe').value;
    ['containerPG', 'containerPGKompleks', 'containerBS', 'containerIsian'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });

    if(tipe === 'PG') document.getElementById('containerPG').classList.remove('hidden');
    else if(tipe === 'PG_KOMPLEKS') document.getElementById('containerPGKompleks').classList.remove('hidden');
    else if(tipe === 'BENAR_SALAH') document.getElementById('containerBS').classList.remove('hidden');
    else if(tipe === 'ISIAN') document.getElementById('containerIsian').classList.remove('hidden');
};

window.previewImage = (input, previewId, base64Id) => {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            // Proses Kompresi Gambar menggunakan Canvas
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                // Set maksimal lebar/tinggi 300px agar ukuran file sangat kecil
                const MAX_WIDTH = 300;
                const MAX_HEIGHT = 300;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
                } else {
                    if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Ubah menjadi format WEBP dengan kualitas 80% (Sangat ringan)
                const compressedDataUrl = canvas.toDataURL('image/webp', 0.8);

                document.getElementById(previewId).src = compressedDataUrl;
                document.getElementById(previewId).classList.remove('hidden');
                document.getElementById(base64Id).value = compressedDataUrl;
            }
            img.src = e.target.result;
        }
        reader.readAsDataURL(file);
    }
};

window.simpanSoal = async () => {
    const btn = document.getElementById('btnSimpanSoal');
    const id = document.getElementById('soalId').value;
    const tipe = document.getElementById('soalTipe').value;
    const pertanyaan = document.getElementById('soalPertanyaan').value;
    const qImg = document.getElementById('soalGambarBase64').value;

    if(!pertanyaan.trim() && !qImg) { alert("Pertanyaan atau Gambar tidak boleh kosong!"); return; }
    let dataSimpan = { type: tipe, q: pertanyaan, subject: state.currentSubject, qImg: qImg || null };

    if(tipe === 'PG') {
        let opts = {};
        opts['A'] = document.getElementById('optA').value;
        opts['B'] = document.getElementById('optB').value;
        opts['C'] = document.getElementById('optC').value;
        opts['D'] = document.getElementById('optD').value;
        let ans = null;
        for(let r of document.getElementsByName('kunciJawabanPG')) if(r.checked) ans = r.value;
        if(!ans) { alert("Pilih kunci jawaban!"); return; }
        dataSimpan.opts = opts; dataSimpan.ans = ans;
    }
    else if (tipe === 'PG_KOMPLEKS') {
        let opts = {}; 
        opts['A'] = document.getElementById('optA_K').value.trim();
        opts['B'] = document.getElementById('optB_K').value.trim();
        opts['C'] = document.getElementById('optC_K').value.trim();
        opts['D'] = document.getElementById('optD_K').value.trim();
        const ansArr = [];
        for(let c of document.getElementsByName('kunciJawabanKompleks')) if(c.checked) ansArr.push(c.value);
        if(ansArr.length === 0) { alert("Pilih minimal satu kunci jawaban!"); return; }
        dataSimpan.opts = opts; dataSimpan.ans = ansArr;
    }
    else if (tipe === 'BENAR_SALAH') {
        let ans = null;
        for(let r of document.getElementsByName('kunciBS')) if(r.checked) ans = r.value;
        if(!ans) { alert("Tentukan Benar atau Salah!"); return; }
        dataSimpan.ans = ans;
    }
    else if (tipe === 'ISIAN') {
        const ans = document.getElementById('kunciIsian').value.trim();
        if(!ans) { alert("Kunci jawaban tidak boleh kosong!"); return; }
        dataSimpan.ans = ans;
    }

    try {
        btn.disabled = true; btn.innerText = "Menyimpan...";
        if(id) await updateDoc(doc(db, 'exam_questions', id), dataSimpan);
        else await addDoc(collection(db, 'exam_questions'), dataSimpan);
        window.closeModal('modalFormSoal');
    } catch (e) { console.error(e); alert("Gagal menyimpan soal.");
    } finally { btn.disabled = false; btn.innerText = "Simpan Soal"; }
};

window.hapusSoal = async (id) => {
    if(confirm("Yakin ingin menghapus soal ini?")) await deleteDoc(doc(db, 'exam_questions', id));
};

// ==========================================
// RENDER JADWAL UJIAN
// ==========================================
window.renderTableUjian = () => {
    const tbody = document.getElementById('tableUjianBody'); tbody.innerHTML = '';
    const subjectsArray = Array.from(state.allSubjectsSet).sort();
    if(subjectsArray.length === 0) { tbody.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-slate-500 italic">Belum ada mata pelajaran.</td></tr>`; return; }
    subjectsArray.forEach((subject) => {
        const schedule = state.examSchedules.find(s => s.subject === subject) || { isActive: false, duration: 90, token: '' };
        const statusBadge = schedule.isActive ? `<span class="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">AKTIF</span>` : `<span class="bg-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">TUTUP</span>`;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="p-4 font-semibold">${subject}</td><td class="p-4 text-center">${statusBadge}</td><td class="p-4 text-center font-mono">${schedule.duration} Menit</td><td class="p-4 text-center font-mono uppercase tracking-widest">${schedule.token || 'Tanpa Token'}</td><td class="p-4 text-center"><button onclick="bukaPengaturanUjian('${subject}')" class="bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1 rounded font-bold">Atur</button></td>`;
        tbody.appendChild(tr);
    });
};

window.bukaPengaturanUjian = (subject) => {
    const schedule = state.examSchedules.find(s => s.subject === subject) || { isActive: false, duration: 90, token: '' };
    document.getElementById('ujianSubject').value = subject;
    document.getElementById('ujianDurasi').value = schedule.duration;
    document.getElementById('ujianToken').value = schedule.token || '';
    document.getElementById('ujianStatus').checked = schedule.isActive;
    document.getElementById('modalPengaturanUjian').classList.remove('hidden');
};

window.simpanPengaturanUjian = async () => {
    const subject = document.getElementById('ujianSubject').value;
    const schedule = state.examSchedules.find(s => s.subject === subject);
    
    const data = {
        subject: subject,
        duration: parseInt(document.getElementById('ujianDurasi').value) || 90,
        token: document.getElementById('ujianToken').value.toUpperCase(),
        isActive: document.getElementById('ujianStatus').checked
    };

    try {
        if(schedule && schedule.id) await updateDoc(doc(db, 'exam_schedules', schedule.id), data);
        else await addDoc(collection(db, 'exam_schedules'), data);
        window.closeModal('modalPengaturanUjian');
    } catch (e) { console.error(e); alert("Gagal mengatur ujian."); }
};

// ==========================================
// RENDER & CRUD PESERTA
// ==========================================
window.renderTablePeserta = () => {
    const tbody = document.getElementById('tablePesertaBody');
    document.getElementById('cetakJumlahPeserta').innerText = state.examParticipants.length;
    tbody.innerHTML = '';
    if(state.examParticipants.length === 0) { tbody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-500">Belum ada data peserta.</td></tr>`; return; }
    state.examParticipants.forEach((p) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="p-4 text-center font-mono font-bold">${p.absen}</td><td class="p-4 text-center font-mono">${p.noUjian || '-'}</td><td class="p-4 font-bold uppercase">${p.nama}</td><td class="p-4 text-center">${p.ruang || '-'}</td><td class="p-4 text-center">${p.sesi || '-'}</td><td class="p-4 text-center tracking-widest">${p.password || p.absen}</td><td class="p-4 text-center space-x-2"><button onclick="editPeserta('${p.id}')" class="text-amber-500">✏️</button><button onclick="hapusPeserta('${p.id}')" class="text-red-500">🗑️</button></td>`;
        tbody.appendChild(tr);
    });
};

window.openPesertaModal = () => {
    document.getElementById('formPeserta').reset();
    document.getElementById('pesertaId').value = '';
    document.getElementById('modalPeserta').classList.remove('hidden');
};

window.generatePassword = () => {
    // Karakter yang digunakan (sengaja menghilangkan huruf O, angka 0, huruf I, dan angka 1 agar siswa tidak bingung saat membaca Kartu Ujian)
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
    let password = '';
    
    // Membuat 6 digit password acak
    for (let i = 0; i < 6; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const inputPassword = document.getElementById('pesertaPassword');
    inputPassword.value = password;
    
    // Memberikan efek visual (flash) sebentar agar admin tahu tombolnya bekerja
    inputPassword.classList.add('bg-green-100');
    setTimeout(() => {
        inputPassword.classList.remove('bg-green-100');
    }, 300);
};

window.simpanPeserta = async () => {
    const btn = document.getElementById('btnSimpanPeserta');
    const id = document.getElementById('pesertaId').value;
    const data = {
        absen: document.getElementById('pesertaAbsen').value,
        noUjian: document.getElementById('pesertaNoUjian').value,
        nama: document.getElementById('pesertaNama').value.toUpperCase(),
        ruang: document.getElementById('pesertaRuang').value,
        sesi: document.getElementById('pesertaSesi').value,
        password: document.getElementById('pesertaPassword').value || document.getElementById('pesertaAbsen').value
    };

    try {
        btn.disabled = true; btn.innerText = "Menyimpan...";
        if(id) await updateDoc(doc(db, 'exam_participants', id), data);
        else await addDoc(collection(db, 'exam_participants'), data);
        window.closeModal('modalPeserta');
    } catch (e) { console.error(e); alert("Gagal menyimpan peserta.");
    } finally { btn.disabled = false; btn.innerText = "Simpan"; }
};

window.editPeserta = (id) => {
    const p = state.examParticipants.find(x => x.id === id);
    if(!p) return;
    document.getElementById('pesertaId').value = p.id;
    document.getElementById('pesertaAbsen').value = p.absen;
    document.getElementById('pesertaNoUjian').value = p.noUjian;
    document.getElementById('pesertaNama').value = p.nama;
    document.getElementById('pesertaRuang').value = p.ruang;
    document.getElementById('pesertaSesi').value = p.sesi;
    document.getElementById('pesertaPassword').value = p.password === p.absen ? '' : p.password;
    document.getElementById('modalPeserta').classList.remove('hidden');
};

window.hapusPeserta = async (id) => {
    if(confirm("Hapus peserta ini?")) await deleteDoc(doc(db, 'exam_participants', id));
};

// ==========================================
// EXPORT & IMPORT EXCEL (PESERTA)
// ==========================================

window.downloadFormatPeserta = () => {
    let dataExport = [];
    
    // Jika data peserta kosong, berikan 1 baris contoh kosong sebagai format
    if (state.examParticipants.length === 0) {
        dataExport.push({
            NO_ABSEN: 1,
            NO_UJIAN: "001-01",
            NAMA_LENGKAP: "NAMA SISWA CONTOH",
            RUANG: "R-01",
            SESI: "1",
            PASSWORD: "1"
        });
    } else {
        // Jika sudah ada data, Export data tersebut
        state.examParticipants.forEach(p => {
            dataExport.push({
                NO_ABSEN: p.absen,
                NO_UJIAN: p.noUjian || '',
                NAMA_LENGKAP: p.nama,
                RUANG: p.ruang || '',
                SESI: p.sesi || '',
                PASSWORD: p.password || p.absen
            });
        });
    }

    // Buat worksheet dan workbook baru
    const ws = XLSX.utils.json_to_sheet(dataExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data_Peserta");
    
    // Unduh file
    XLSX.writeFile(wb, "Peserta_Ujian_CBT.xlsx");
};

window.prosesImportPeserta = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Munculkan loading indicator saat memproses
    document.getElementById('loadingIndicator').classList.remove('hidden');

    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0]; // Ambil sheet pertama
            const sheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(sheet);

            if (json.length === 0) {
                alert("File Excel kosong atau format tidak sesuai!");
                return;
            }

            let successCount = 0;
            // Proses baris per baris
            for (const row of json) {
                // Syarat mutlak: Harus ada NO_ABSEN dan NAMA_LENGKAP
                if (!row.NO_ABSEN || !row.NAMA_LENGKAP) continue;

                const absenStr = String(row.NO_ABSEN).trim();
                const namaStr = String(row.NAMA_LENGKAP).trim().toUpperCase();
                
                const dataSimpan = {
                    absen: absenStr,
                    noUjian: row.NO_UJIAN ? String(row.NO_UJIAN).trim() : '',
                    nama: namaStr,
                    ruang: row.RUANG ? String(row.RUANG).trim() : '',
                    sesi: row.SESI ? String(row.SESI).trim() : '',
                    password: row.PASSWORD ? String(row.PASSWORD).trim() : absenStr
                };

                // Cek apakah No Absen ini sudah ada di database (state)
                const exist = state.examParticipants.find(p => p.absen === absenStr);

                if (exist && exist.id) {
                    // Jika sudah ada, UPDATE data yang lama
                    await updateDoc(doc(db, 'exam_participants', exist.id), dataSimpan);
                } else {
                    // Jika belum ada, TAMBAH data baru
                    await addDoc(collection(db, 'exam_participants'), dataSimpan);
                }
                successCount++;
            }

            alert(`Berhasil mengimpor/memperbarui ${successCount} data peserta!`);
        } catch (error) {
            console.error("Error import excel:", error);
            alert("Terjadi kesalahan saat membaca file. Pastikan format kolom sesuai dengan template (Export).");
        } finally {
            // Sembunyikan loading dan reset input file agar bisa import file yang sama lagi jika perlu
            document.getElementById('loadingIndicator').classList.add('hidden');
            document.getElementById('fileImportPeserta').value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
};
