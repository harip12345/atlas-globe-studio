# Otomasi video oleh AI agent

AI agent yang dapat membaca/menulis repo dan menjalankan Node.js bisa membuat video ini tanpa mengklik UI. Agent menyusun narasi, lokasi, objek, durasi, dan kamera dalam JSON, lalu menjalankan CLI. Editor tidak memanggil model AI secara otomatis; proses berpikir dan penulisan adegan dilakukan agent yang mengakses repo.

Semua contoh perintah dijalankan dari folder `globe-studio`. Node.js 22+, dependensi npm, Chrome/Edge, FFmpeg, dan FFprobe diperlukan untuk render. Membuat JSON dan validasi tidak membutuhkan browser atau FFmpeg. CLI render menyalakan server sementara pada port kosong sendiri, sehingga tidak perlu menghentikan editor di port 3100.

## Buat proyek

```powershell
npm run agent -- init --out projects/cerita.json --pace fast
```

Ini membuat demo yang bisa diedit, dengan transisi 0,5 detik di semua adegan. Untuk mulai dari file narasi, satu paragraf per adegan:

```powershell
npm run agent -- init --script projects/narasi-contoh.txt --out projects/narasi.json --pace fast
```

Pengenalan lokasi mengikuti daftar dalam `public/model.js`. Untuk lokasi yang tidak tersedia atau kebutuhan visual lebih spesifik, agent harus menulis koordinat dan properti adegan sendiri. Helper narasi tidak melakukan riset, tidak memanggil LLM, dan tidak menyelaraskan audio.

## Ubah tempo tanpa memotong pembahasan

```powershell
npm run agent -- pace projects/cerita.json --pace fast --out projects/cerita-cepat.json
npm run agent -- pace projects/cerita.json --seconds 0.25 --out projects/cerita-kilat.json
```

Preset: `fast` = 0,5 detik, `normal` = 1,5 detik, `cinematic` = 3,5 detik. `--seconds` menerima 0,25–10 detik. Perintah ini hanya mengubah `transition`; durasi adegan, narasi, dan total video tetap. Setelah kamera tiba, gerakan mengikuti `motion`: `hold`, `orbit`, atau `push`.

Contoh: `duration: 6` dan `transition: 0.5` berarti kamera bergerak selama 0,5 detik, lalu membahas lokasi selama sisa adegan. Waktu transisi efektif dibatasi 72% dari durasi adegan; pada adegan pertama kamera sudah berada di tujuan sehingga tidak ada perpindahan dari lokasi sebelumnya.

## Validasi dan render

```powershell
npm run agent -- validate projects/cerita-cepat.json
npm run agent -- render projects/cerita-cepat.json --out output/cerita-cepat.mp4 --quality draft
npm run agent -- render projects/cerita-cepat.json --out output/cerita-final.mp4 --quality final --audio "D:\rekaman\narasi.mp3"
```

`--quality draft` menghasilkan 540×960 dan `final` menghasilkan 1080×1920. FPS default 30; `--fps 24` juga tersedia. Render menghasilkan MP4, JSON yang benar-benar digunakan, dan SRT dengan nama dasar yang sama. `--pace fast` atau `--seconds 0.25` dapat diberikan langsung ke render untuk menimpa transisi pada hasil; input JSON tetap utuh. `--out` yang sudah ada akan ditimpa, jadi gunakan nama baru untuk variasi video.

Untuk keluaran mesin tanpa baris tambahan npm:

```powershell
node scripts/agent.js render projects/cerita-cepat.json --out output/cerita-cepat.mp4
```

CLI mengeluarkan satu hasil JSON ke stdout, progres render ke stderr, dan exit code nonzero jika gagal. MP4 tanpa `--audio` tidak bersuara. Audio yang lebih pendek diisi hening dan yang lebih panjang dipotong mengikuti durasi video.

## Menulis adegan terstruktur

Agent bisa membuat skrip `.mjs` yang memakai model agar tidak perlu mengisi semua default:

```js
import fs from 'node:fs';
import { demo, scene, validateProject } from './public/model.js';

const project = validateProject({
  ...demo(),
  name: 'Kisah jalur laut',
  scenes: [
    scene({ title: 'Sebuah perjalanan.', location: 'Bumi', lat: 10, lon: 40,
      altitude: 3.2, duration: 4, transition: 0.5, motion: 'orbit',
      narration: 'Mari melihat perjalanan ini dari angkasa.' }),
    scene({ title: 'Mendekat ke Suez.', location: 'Terusan Suez',
      lat: 30.58, lon: 32.34, altitude: 0.14, tilt: 30,
      object: 'ship', duration: 6, transition: 0.5,
      narration: 'Kini kamera mendekati Terusan Suez. Kapal berikut merupakan ilustrasi.' }),
  ],
});
fs.mkdirSync('projects', { recursive: true });
fs.writeFileSync('projects/jalur-laut.json', JSON.stringify(project, null, 2));
```

Properti penting per adegan:

| Properti | Arti / batas |
| --- | --- |
| `lat`, `lon` | Lintang −85…85; bujur −180…180 |
| `altitude` | Jarak relatif radius bumi, 0,065…5; sekitar 3,2 untuk globe dan 0,085…0,18 untuk objek |
| `duration` | Lama pembahasan adegan, 1…30 detik |
| `transition` | Lama kamera menuju lokasi, 0,25…10 detik |
| `tilt` | Sudut pandang 0…45 derajat |
| `motion` | `hold`, `orbit`, `push` |
| `object` | `none`, `city`, `volcano`, `mountain`, `ship`, `forest` |
| `title`, `eyebrow` | Judul (maks. 120 karakter) dan teks kecil (80) |
| `narration` | Narasi/subtitle, maks. 1.500 karakter |
| `location` | Label lokasi, maks. 70 karakter |
| `stat`, `statLabel` | Callout (40 karakter) dan keterangan (90) |

Proyek memakai `version: 1`, ID adegan unik, maksimal 20 adegan dan 120 detik. `validateProject()` adalah sumber validasi yang dipakai editor dan renderer. Subtitle mengikuti waktu adegan dan urutan kata, belum hasil speech alignment.

## Warna bumi dan sorotan wilayah

Pengaturan global `surface` disimpan pada level proyek. Semua nilai opsional dan proyek lama menerima nilai netral:

```json
{
  "surface": {
    "brightness": 1.4,
    "landBrightness": 1.7,
    "oceanBrightness": 1.2,
    "landColor": "#b8cf8a",
    "oceanColor": "#236c9f",
    "tintStrength": 0.65
  }
}
```

Kecerahan berkisar 0,25–3; `tintStrength` 0–1. Warna hex dicampur dengan detail tekstur. Kecerahan hanya mengubah permukaan bumi, sementara teks dan sorotan tetap terbaca. Daratan dan laut dipisahkan dengan mask poligon Natural Earth, bukan deteksi warna foto.

Pengaturan per adegan:

```json
{
  "highlight": {
    "regions": [
      { "type": "country", "id": "360" },
      { "type": "island", "id": "java" }
    ],
    "color": "#ffb765",
    "opacity": 0.8,
    "style": "hatch",
    "pulse": true
  },
  "effect": "radar"
}
```

`country` memakai ID dari `public/countries.js` (contoh `360` Indonesia, `392` Jepang, `840` Amerika Serikat). `island` memakai ID dari `public/geography.js`: `java`, `sumatra`, `borneo`, `sulawesi`, `bali`, `new-guinea`, `madagascar`, `great-britain`. Negara memakai batas negara; pulau memakai daratan yang telah digabung lintas negara. Jangan memberi label pulau Borneo sebagai wilayah Indonesia saja.

Gaya sorotan: `hatch`, `solid`, atau `outline`. Opacity 0–1, maksimal 16 wilayah per adegan. Untuk area lain, gunakan `type: "polygon"`, `name`, dan `coordinates` berupa array ring GeoJSON. Tiap titik adalah `[bujur, lintang]`; ring harus tertutup, minimal 4 titik, maksimal 8 ring/512 titik per wilayah. Poligon custom mewakili sisi bola yang lebih kecil (di bawah setengah luas bumi). Koordinat harus diverifikasi sesuai kebutuhan narasi.

```json
{
  "type": "polygon",
  "name": "Area contoh",
  "coordinates": [[[109,-8],[111,-8],[111,-7],[109,-7],[109,-8]]]
}
```

Letakkan objek tersebut di `scene.highlight.regions`. Poligon custom tidak otomatis dipotong mengikuti daratan; agent dapat memakainya untuk area laut juga.

## Menambah efek yang belum ada

`effect` tersedia sebagai `none`, `radar`, atau `beacon`. Untuk menambahkan efek lain, agent bisa memperluas `EFFECT_BUILDERS` dalam `public/effects.js` dan menambahkan nama/label pada `EFFECT_TYPES` di `public/model.js`. Editor akan membuat pilihan efek dari katalog tersebut. Builder menerima `{T, group, color}` lalu mengembalikan fungsi `update(t)`; masukkan mesh ke `group` dan hitung animasi dari waktu absolut, bukan `Date.now()` atau randomness yang berubah per frame. Renderer membersihkan mesh/material/geometri grup ketika berpindah adegan.

Ini merupakan ekstensi kode oleh agent, bukan generator efek tanpa batas di UI. Aset eksternal seperti model 3D, gambar, atau video perlu diimpor dan diintegrasikan sesuai format/lisensinya agar tersedia untuk preview dan ekspor lokal. Lakukan pekerjaan dalam folder studio ini; tidak perlu mengubah aplikasi Motion di parent folder.

`public/lib/geo.js` adalah bundle lokal D3. Jika dependensi geografi diperbarui, bangun ulang dengan `npm run build:geo`. Pemberitahuan lisensi ada di `public/lib/LICENSES.txt`.

## Contoh instruksi untuk agent

> Baca AGENTS.md dan AUTOMATION.md di globe-studio. Buat short 30 detik tentang [topik], dengan zoom antarlokasi 0,5 detik. Susun pembahasan yang sesuai durasi, verifikasi fakta dan koordinat, lalu tulis projects/[nama].json. Gunakan audio [path] bila tersedia. Validasi, render draft, periksa komposisi, lalu render Full HD ke output/[nama].mp4. Berikan MP4, JSON, dan SRT.

JSON hasil agent dapat dibuka melalui tombol **Buka proyek** di editor. Mengubah file repo tidak otomatis mengganti proyek yang sedang terbuka di browser, karena editor menyimpan salinannya dalam localStorage.
