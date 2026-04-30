// js/ui/print.js
import { state } from '../services/store.js';

window.cetakDaftarHadir = () => {
    const sekolah = state.schoolProfile.namaSekolah || 'NAMA SEKOLAH';
    const tahun = state.schoolProfile.tahunAjaran || '20.../20...';
    const pengawas = state.schoolProfile.pengawas || '................................';
    const proktor = state.schoolProfile.proktor || '................................';

    const printWindow = window.open('', '_blank');
    let rowsHtml = '';
    
    if(state.examParticipants.length === 0) {
        for(let i=1; i<=20; i++) rowsHtml += `<tr><td style="border:1px solid black; padding:8px;">${i}</td><td style="border:1px solid black; padding:8px;" colspan="4">Kosong</td></tr>`;
    } else {
        state.examParticipants.forEach((res, index) => {
            const no = index + 1;
            rowsHtml += `<tr>
                <td style="border:1px solid black; text-align:center; padding:8px;">${no}</td>
                <td style="border:1px solid black; text-align:center; padding:4px;"><b>${res.noUjian || '-'}</b><br><span style="font-size:10px;">Absen: ${res.absen || '-'}</span></td>
                <td style="border:1px solid black; padding:8px; text-transform:uppercase;">${res.nama || '-'}</td>
                <td style="border:1px solid black; padding:8px; font-size:12px;">${no % 2 !== 0 ? no + '. .................' : ''}</td>
                <td style="border:1px solid black; padding:8px; font-size:12px;">${no % 2 === 0 ? no + '. .................' : ''}</td>
            </tr>`;
        });
    }

    const html = `<html><head><title>Daftar Hadir - ${state.currentSubject}</title>
    <style>body { font-family: 'Times New Roman', serif; padding: 20px; } table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }</style>
    </head><body><h2 style="text-align:center;">DAFTAR HADIR PESERTA<br>${sekolah} - TAHUN PELAJARAN ${tahun}</h2><p><b>Mata Pelajaran:</b> ${state.currentSubject}</p>
    <table><thead><tr><th style="border:1px solid black; padding:10px;">No</th><th style="border:1px solid black; padding:10px;">No Peserta / Absen</th><th style="border:1px solid black; padding:10px;">Nama Peserta</th><th style="border:1px solid black; padding:10px;" colspan="2">Tanda Tangan</th></tr></thead><tbody>${rowsHtml}</tbody></table>
    <script>window.print();<\/script></body></html>`;
    
    printWindow.document.open(); printWindow.document.write(html); printWindow.document.close();
};

window.cetakKartuPeserta = () => {
    // Fungsi logik cetak kartu dari state.examParticipants (sama seperti sebelumnya)
};
