# ATLAS — Globe Motion Studio

Studio lokal untuk membuat video short **9:16** dengan globe 3D, pergerakan kamera dari angkasa ke lokasi, jalur perjalanan, label, subtitle, dan objek ilustrasi. Mendukung arsiran negara/pulau, warna daratan dan laut, serta otomasi melalui AI agent dan CLI.

## Jalankan

Pasang Node.js 22+, Chrome/Edge, serta FFmpeg dan FFprobe di PATH. Setelah clone repo, jalankan dari PowerShell:

```powershell
cd atlas-globe-studio
npm ci
npm start
```

Buka **http://127.0.0.1:3100**. Bisa juga klik dua kali `start-studio.cmd`. Gunakan Chrome atau Edge dengan WebGL aktif.

Jika browser terpasang di lokasi lain:

```powershell
$env:CHROME_PATH = 'C:\lokasi\chrome.exe'
npm start
```

Port bisa diubah dengan `$env:PORT = '3200'`. Server hanya mendengarkan localhost. Tekstur, peta, dan modul dimuat dari komputer sendiri; tidak perlu API key atau koneksi internet setelah instalasi.

## Membuat video

1. **Pilih template.** Ada cerita Nusantara, jalur pelayaran, pegunungan, dan perjalanan antarkota.
2. **Pilih adegan di kiri.** Ubah judul, lokasi, lintang/bujur, jarak kamera, sudut, durasi, dan waktu transisi di kanan. Kamera bergerak dari posisi akhir adegan sebelumnya ke tujuan adegan aktif. Pada adegan pertama, kamera mulai langsung dari tujuannya.
3. **Atur objek.** Pilih kota, gunung berapi, pegunungan, kapal kontainer, atau hutan. Objek muncul saat kamera cukup dekat; geser jarak kamera ke kiri untuk melihatnya. Lokasi dan ukuran objek adalah ilustrasi, bukan bangunan atau bentang alam aktual.
4. **Isi narasi.** Teks di setiap adegan menjadi subtitle bergantian. Tab Narasi juga dapat menyusun satu adegan per paragraf dan mengenali 16 lokasi dalam daftar. Ini pencocokan nama lokasi, bukan generator AI; koordinat lokasi lain dapat diketik sendiri. Lokasi yang tidak dikenali memakai lokasi terakhir (awalnya Indonesia).
5. **Unggah voice-over di tab Audio.** Subtitle mengikuti durasi adegan dan urutan kata; belum menggunakan pengenalan suara atau penyelarasan ucapan. Sesuaikan durasi adegan dengan rekaman.
6. **Atur gaya.** Ubah warna aksen, tampilan bumi, brand, garis koordinat, batas negara, label, jalur, dan subtitle.
7. **Putar dan ekspor.** Pilih draft 540×960 atau Full HD 1080×1920, H.264 MP4, 30 fps. Audio pilihan diubah menjadi AAC. Tanpa unggahan audio, hasil MP4 tidak bersuara.

Spasi untuk play/pause, panah kiri/kanan untuk berpindah 0,5 detik, Ctrl+Z / Ctrl+Shift+Z untuk urungkan/ulangi. Safe area hanya panduan editor. Tombol Frame mengunduh PNG dari frame aktif.

## Transisi cepat

Transisi bisa dipercepat dari panel kanan melalui **Transisi semua adegan → Cepat · 0,5s**. Pilihan lain: Normal 1,5s dan Sinematik 3,5s. Nilai **Transisi · Detik** tetap dapat diatur per adegan hingga 0,25s. Kecepatan kamera tidak memotong durasi pembahasan atau narasi. Muat ulang editor sekali untuk melihat kontrol baru.

## Arsiran, warna, dan efek

- **Panel kanan → Sorot wilayah:** pilih negara atau pulau. Bisa lebih dari satu (maksimal 16 per adegan), dengan arsir diagonal, warna penuh, atau garis tepi. Atur warna, kekuatan sorotan, dan denyut. Hapus wilayah dengan menekan chip namanya.
- Pilihan negara berasal dari peta Natural Earth yang dibundel. Pilihan pulau tersedia untuk Jawa, Sumatra, Borneo/Kalimantan, Sulawesi, Bali, New Guinea/Papua, Madagaskar, dan Britania Raya. Pilihan pulau mengikuti **seluruh pulau**, termasuk jika dimiliki lebih dari satu negara. Contoh: Kalimantan/Borneo mencakup bagian Indonesia, Malaysia, dan Brunei. Untuk menyorot hanya Indonesia, pilih negara Indonesia.
- **Tab Gaya → Daratan & lautan:** atur kecerahan bumi, kecerahan daratan, dan kecerahan laut secara terpisah (25–300%). Warna daratan dan laut memiliki pemilih warna serta kekuatan tint 0–100%. Pada 0%, tekstur asli dipertahankan; memilih warna ketika kekuatannya 0% otomatis mengaktifkan tint 65%. Gunakan Reset untuk kembali ke tampilan asli.
- Warna daratan/laut berlaku global. Untuk mewarnai satu pulau/negara tertentu, gunakan warna sorotan wilayah per adegan.
- **Efek lokasi:** radar atau beacon dapat dipilih per adegan. Efek ini muncul di lokasi adegan, terpisah dari poligon sorotan. Posisinya mengikuti kamera globe dan ikut dirender ke MP4.
- AI agent dapat menulis wilayah lain sebagai poligon `[bujur, lintang]` dalam JSON. Ini membantu jika pulau belum tersedia sebagai preset. Periksa poligon yang dipakai; mask mengikuti data yang diberikan.

Arsiran menggunakan batas peta skala 1:50 juta, sehingga garis pantai dan pulau kecil dapat disederhanakan. Sorotan ini bukan batas survei atau data teritorial terkini. Untuk tambahan efek di luar pilihan awal, agent dapat mengembangkan modul `public/effects.js` atau mengintegrasikan aset yang tersedia; aset yang belum diimpor tidak otomatis muncul di studio.

Contoh siap edit: `projects/regions-colors.json` (12 detik): arsir negara Indonesia → warna pulau Jawa → garis tepi seluruh pulau Borneo, dengan warna bumi yang lebih terang. Buat MP4 lewat `node scripts/agent.js render projects/regions-colors.json --out output/regions-final.mp4 --quality final`.

## Simpan dan lanjutkan

- Perubahan proyek disimpan otomatis dalam localStorage browser pada origin/port yang sama.
- Tombol **Simpan** mengunduh JSON; **Buka proyek** memuat JSON kembali.
- JSON menyimpan visual dan teks. Berkas audio terpisah: simpan file audio asli dan unggah kembali saat memindahkan proyek. Audio terakhir di browser yang sama dapat digunakan selama filenya masih ada di `output/`.
- Ekspor MP4, JSON, SRT, serta unggahan audio berada di `output/`. File tidak dihapus otomatis. Status pekerjaan hanya berlaku selama server hidup. Proses render berhenti jika server ditutup.
- Maksimal 20 adegan, 120 detik total, 1–30 detik per adegan, dan unggahan audio maksimal 30 MB. Ekspor berjalan satu per satu dan dapat dibatalkan.
- Audio dimulai pada detik 0, dipotong jika lebih panjang dari video, dan diisi hening jika lebih pendek.

## Contoh dan render dari kode

Demo bawaan berdurasi **22 detik, tanpa audio**: Bumi → Indonesia → Jakarta → Gunung Merapi. Buat MP4, JSON, dan SRT dengan perintah di bawah. Folder `output/` berisi hasil render/unggahan lokal dan tidak disertakan dalam Git. Setelah render, tonton di http://127.0.0.1:3100/output/atlas-demo.mp4.

```powershell
npm run render
npm run render -- --final
node scripts/render-demo.js "output/atlas-demo.json" --final
```

Perintah tersebut merender ulang demo ke `output/atlas-demo.mp4`. Render memakai browser headless dan FFmpeg, bukan perekaman layar real-time; kecepatan render bergantung komputer. Preview dan ekspor memakai fungsi gambar yang sama.

Mesin dipisahkan dari editor:

```js
import { GlobeFilm } from './engine.js';
import { demo } from './model.js';

const film = new GlobeFilm(canvas, 1080, 1920);
film.setProject(demo());
await film.ready;
film.draw(12.5); // detik absolut; deterministik, dapat di-scrub atau dirender per frame
```

`public/model.js` mengatur schema proyek, template, posisi kamera, parsing narasi, dan subtitle. `public/engine.js` mengatur globe, objek, dan komposisi. Tambahkan bentuk baru di `buildDetail()` dan daftar objek di model/editor untuk memperluas jenis ilustrasi. Tidak memakai Remotion; mesin frame deterministik ini dapat dibungkus ke pipeline lain bila diperlukan.

## Otomasi AI agent

AI agent dengan akses repo dan terminal dapat menyusun JSON lalu merender video tanpa mengklik editor. Panduan dan contoh perintah ada di [AUTOMATION.md](AUTOMATION.md); petunjuk untuk agent ada di [AGENTS.md](AGENTS.md).

```powershell
npm run agent -- init --out projects/cerita.json --pace fast
npm run agent -- validate projects/cerita.json
npm run agent -- render projects/cerita.json --out output/cerita.mp4 --quality final
```

## Validasi

```powershell
npm test
npm run check
```

Unit test menguji kontinuitas kamera, lintasan melewati garis tanggal, batas schema, serta narasi dan SRT. Pemeriksaan browser menguji edit, duplikat/hapus, undo, pemilihan lokasi, playback, tampilan ponsel, dan ekspor MP4 sesungguhnya dengan audio. Hasil render diperiksa memakai FFprobe.

## Batas visual saat ini

Globe memakai tekstur global dan batas negara Natural Earth. Zoom dekat **belum menggunakan tile satelit beresolusi jalan, terrain elevasi aktual, atau fotogrametri bangunan**. Objek dekat adalah ilustrasi prosedural. Untuk tampilan setara Google Earth pada level bangunan, perlu menambahkan sumber tile/terrain berlisensi dan pipeline kamera yang sesuai. Video referensi YouTube belum dapat diputar pada sesi pembuatan, sehingga implementasi ini mengikuti deskripsi globe dan zoom pengguna, bukan salinan frame demi frame.

Sumber aset dan pemberitahuan lisensi ada di `ASSETS.md`.
