# Sumber aset

- `public/assets/earth.jpg`: [earth-blue-marble.jpg, repositori three-globe](https://github.com/vasturiano/three-globe/blob/master/example/img/earth-blue-marble.jpg). Diunduh dari URL raw repositori. Repositori berlisensi MIT, Copyright (c) 2019 Vasco Asturiano. Pemberitahuan MIT disertakan di bawah.
- `public/assets/countries.json`: [world-atlas 2.0.2, countries-50m.json](https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json). [Dokumentasi sumber](https://github.com/topojson/world-atlas) menjelaskan data batas negara berasal dari Natural Earth 4.1.0. Pemberitahuan ISC world-atlas disertakan di bawah. Batas ditampilkan untuk konteks visual.
- `three` 0.187.0: [Three.js](https://threejs.org/), lisensi MIT tersedia dalam `node_modules/three/LICENSE`.
- `playwright-core` 1.65.0: [Microsoft Playwright](https://github.com/microsoft/playwright), Apache-2.0; lisensi tersedia dalam `node_modules/playwright-core/LICENSE`.
- `public/lib/geo.js`: bundle lokal fungsi proyeksi/path dari [D3 Geo](https://github.com/d3/d3-geo), beserta bagian `d3-array` dan `internmap` yang digunakan. Pemberitahuan lisensi lengkap tersedia dalam `public/lib/LICENSES.txt`. Bundler pengembangan: esbuild (MIT), dari registry npm.
- Objek kota, gunung, kapal, hutan, antarmuka, serta animasi dibuat secara prosedural untuk proyek ini. Tidak ada frame, musik, atau audio video referensi yang disalin.

## Three-globe — MIT License

Copyright (c) 2019 Vasco Asturiano

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## World-atlas — ISC

Copyright 2013-2019 Michael Bostock

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
