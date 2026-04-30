// js/ui/print.js
import { state } from '../services/store.js';

window.cetakDaftarHadir = () => {
    // 1. Ambil Data Profil dari State
    const p = state.schoolProfile;
    const sekolah = p.namaSekolah || 'NAMA SEKOLAH';
    const alamat = p.alamat || 'Alamat Sekolah';
    const email = p.email || '-';
    const website = p.website || '-';
    const tahun = p.tahunAjaran || '20.../20...';
    const namaUjian = p.namaUjian || 'PENILAIAN AKHIR JENJANG (PAJ)';
    const kelas = p.kelas || '-';
    const pengawas = p.pengawas || '................................';
    const nipPengawas = p.nipPengawas || '-';
    
    // 2. Siapkan Tag Gambar untuk Logo (Jika ada)
    const logoKiri = p.logoKab ? `<img src="${p.logoKab}" style="width:85px; height:auto; max-height:100px; object-fit:contain;">` : '';
    const logoKanan = p.logoSekolah ? `<img src="${p.logoSekolah}" style="width:85px; height:auto; max-height:100px; object-fit:contain;">` : '';

    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    
    // 3. Render Baris Tabel Peserta (Hanya Nomor Ujian dan Nama)
    if(state.examParticipants.length === 0) {
        // Jika data kosong, beri 20 baris kosong sebagai template tulis tangan
        for(let i=1; i<=20; i++) {
            rowsHtml += `<tr>
                <td style="border:1px solid black; text-align:center; padding:8px;">${i}</td>
                <td style="border:1px solid black; padding:8px;"></td>
                <td style="border:1px solid black; padding:8px;"></td>
                <td style="border:1px solid black; padding:8px; font-size:12px; width:15%;">${i % 2 !== 0 ? i + '. .................' : ''}</td>
                <td style="border:1px solid black; padding:8px; font-size:12px; width:15%;">${i % 2 === 0 ? i + '. .................' : ''}</td>
            </tr>`;
        }
    } else {
        // Jika ada data, loop peserta
        state.examParticipants.forEach((res, index) => {
            const no = index + 1;
            rowsHtml += `<tr>
                <td style="border:1px solid black; text-align:center; padding:8px;">${no}</td>
                <td style="border:1px solid black; text-align:center; padding:8px; font-weight:bold; letter-spacing: 1px;">${res.noUjian || '-'}</td>
                <td style="border:1px solid black; padding:8px; text-transform:uppercase;">${res.nama || '-'}</td>
                <td style="border:1px solid black; padding:8px; font-size:12px; width:15%;">${no % 2 !== 0 ? no + '. .................' : ''}</td>
                <td style="border:1px solid black; padding:8px; font-size:12px; width:15%;">${no % 2 === 0 ? no + '. .................' : ''}</td>
            </tr>`;
        });
    }

    // 4. Struktur HTML Utama (Kop Surat, Judul, Info Ujian, Tabel, Tanda Tangan)
    const html = `
    <html>
    <head>
        <title>Daftar Hadir - ${state.currentSubject}</title>
        <style>
            body { font-family: 'Times New Roman', Times, serif; padding: 20px; color: black; line-height: 1.3; }
            .kop-surat { width: 100%; border-bottom: 3px solid black; margin-bottom: 2px; }
            .kop-surat td { padding: 5px; }
            .garis-bawah { border-top: 1px solid black; margin-bottom: 25px; }
            .tabel-data { width: 100%; border-collapse: collapse; margin-bottom: 30px; margin-top: 15px; }
            .tabel-data th { background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .info-ujian table { width: 100%; font-weight: bold; margin-bottom: 15px; font-size: 11pt; }
            .info-ujian td { padding: 3px 0; }
            @media print {
                @page { margin: 1cm; }
                body { padding: 0; }
            }
        </style>
    </head>
    <body>
        <!-- KOP SURAT -->
        <table class="kop-surat">
            <tr>
                <td width="15%" align="center" valign="middle">${logoKiri}</td>
                <td width="70%" align="center">
                    <div style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">PEMERINTAH KABUPATEN SAMPANG</div>
                    <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">DINAS PENDIDIKAN</div>
                    <div style="font-size: 18pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${sekolah}</div>
                    <div style="font-size: 11pt; margin-top: 2px;">${alamat}</div>
                    <div style="font-size: 10pt; margin-top: 2px;">Email: ${email} | Website: ${website}</div>
                </td>
                <td width="15%" align="center" valign="middle">${logoKanan}</td>
            </tr>
        </table>
        <div class="garis-bawah"></div>

        <!-- JUDUL -->
        <div style="text-align:center; margin-bottom: 25px;">
            <h3 style="margin:0; text-decoration: underline; font-size:14pt;">DAFTAR HADIR PESERTA</h3>
            <h4 style="margin:5px 0 0 0; font-size:12pt; text-transform: uppercase;">${namaUjian}</h4>
        </div>

        <!-- INFO UJIAN -->
        <div class="info-ujian">
            <table>
                <tr>
                    <td width="16%">Mata Pelajaran</td><td width="2%">:</td><td width="32%">${state.currentSubject}</td>
                    <td width="16%">Kelas</td><td width="2%">:</td><td width="32%">${kelas}</td>
                </tr>
                <tr>
                    <td>Tahun Pelajaran</td><td>:</td><td>${tahun}</td>
                    <td>Ruang / Sesi</td><td>:</td><td>....... / .......</td>
                </tr>
            </table>
        </div>

        <!-- TABEL PESERTA -->
        <table class="tabel-data">
            <thead>
                <tr>
                    <th style="border:1px solid black; padding:10px; width:5%;">No</th>
                    <th style="border:1px solid black; padding:10px; width:20%;">Nomor Peserta</th>
                    <th style="border:1px solid black; padding:10px; width:45%;">Nama Lengkap</th>
                    <th style="border:1px solid black; padding:10px; width:30%;" colspan="2">Tanda Tangan</th>
                </tr>
            </thead>
            <tbody>
                ${rowsHtml}
            </tbody>
        </table>

        <!-- TANDA TANGAN PENGAWAS -->
        <table style="width: 100%; margin-top: 40px; page-break-inside: avoid;">
            <tr>
                <td width="55%"></td>
                <td width="45%" align="center">
                    <p style="margin: 0 0 5px 0;">Sampang, .................................... ${new Date().getFullYear()}</p>
                    <p style="margin: 0;">Pengawas Ruang,</p>
                    <br><br><br><br>
                    <p style="margin: 0; font-weight: bold; text-decoration: underline;">${pengawas}</p>
                    <p style="margin: 2px 0 0 0;">NIP. ${nipPengawas}</p>
                </td>
            </tr>
        </table>

        <!-- SCRIPT AUTO-PRINT -->
        <script>
            // Memberikan jeda 0.5 detik agar gambar logo termuat sempurna sebelum dialog Print muncul
            setTimeout(() => {
                window.print();
            }, 500);
        <\/script>
    </body>
    </html>
    `;
    
    printWindow.document.open(); 
    printWindow.document.write(html); 
    printWindow.document.close();
};

window.cetakBeritaAcara = () => {
    alert("Fitur Cetak Berita Acara sedang disiapkan.");
};

window.cetakKartuPeserta = () => {
    alert("Fitur Cetak Kartu Peserta sedang disiapkan.");
};
