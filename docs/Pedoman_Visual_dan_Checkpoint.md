# Game AHS — Pedoman Visual dan Fondasi Kode

**Proyek:** County builder 3D berlatar Majapahit, dapat dimainkan di browser  
**Status:** Prototipe playable; layout desa melingkar v10 dan panel informasi tenaga kerja berdasarkan kapasitas produksi  
**Tanggal:** 25 November 2026  
**Demo:** [Tanah Majapahit](https://majapahit-terrain-ahs.vast-vine-9923.chatgpt.site)

Dokumen ini mencatat arahan pengguna dan kondisi prototipe saat ini. Jadikan sebagai acuan kerja pada perubahan berikutnya; ubah arahnya jika pengguna memberikan instruksi baru. Ini bukan pendaftaran hak paten atau klaim kepemilikan atas CityRT.

## 1. Arah utama

Bangun game county builder dalam dunia 3D berlatar kerajaan Majapahit. Pengguna menentukan blueprint, mekanik dan tahapan pengembangan; pengembangan dilakukan bertahap berdasarkan arahannya.

CityRT dan gambar referensi pengguna menjadi **acuan rasa visual**: dunia seperti maket arsitektur digital, bersih, cerah, nyaman dilihat dan mudah dibaca dari kamera atas. Adaptasi suasananya menjadi Jawa tropis pada masa Majapahit. Gunakan aset orisinal; referensi tidak berarti menyalin aset atau identitas CityRT.

## 2. Standar visual yang disepakati

### Dunia dan terrain

- Geometri 3D stylized low-to-mid poly, rapi, dengan bentuk yang mudah dikenali. Gunakan warna dan shading sederhana; hindari tampilan fotorealistis yang berat.
- Permukaan rumput dan air halus, warna berpadu dan transisinya lembut. Hindari tampilan kotak-kotak atau batas petak yang terlihat jelas dalam tampilan normal.
- Kontur alami dengan perbukitan 3D tinggi berkelompok, lereng hijau dan sedikit batu pada area curam; sediakan area datar terbuka untuk pembangunan.
- Sungai mengikuti bentuk alami; tepian berbaur dengan tanah. Air menggunakan biru kehijauan yang lembut.
- Nuansa alam tropis Jawa: pepohonan hijau berkelompok, kanopi lebar, beberapa palem, dan variasi ukuran serta kepadatan hutan. Jangan memenuhi seluruh peta dengan rumput atau foliage 3D kecil.
- Cahaya dan warna mengarah ke suasana hangat dan nyaman, dengan kedalaman visual yang jelas. Shading dan pencahayaan dapat disempurnakan bertahap sesuai kemampuan implementasi.

### Bangunan dan komposisi desa saat ini

- Bahasa arsitektur Majapahit tetap memakai aset yang telah dibuat: bentuk atap, kayu, bata merah, pagar, sumur, sawah dan vegetasi tropis.
- Layout desa melingkar v10 mengelompokkan bangunan kecil sejenis dalam blok rapat 2×2. Rumah berada lebih dekat ke pusat, farm atau rumah kayu mengitari bagian luar; radius bertambah bertahap ketika kelompok padat. Layout dan jalan lokal dibuat ulang setiap lima bangunan tambahan, tanpa mengurangi jumlah atau luas bangunan ekonomi.
- Panel detail desa menampilkan jumlah penduduk yang bekerja penuh dan idle menurut kapasitas bangunan produksi. Ini ringkasan kapasitas, bukan simulasi villager individual atau assignment pekerja.
- Gunakan aset orisinal; gambar referensi menunjukkan rasa komposisi, bukan algoritma internal atau aset yang disalin.

## 3. Fondasi teknis prototipe saat ini

| Komponen | Kondisi saat ini |
| --- | --- |
| Platform | Halaman web statis dengan HTML, CSS, dan JavaScript. |
| Peta | Wilayah logis 125 × 125 tile, total 15.625 tile; ukuran setiap tile tetap sama seperti versi 50 × 50. Warna terrain menggunakan transisi halus agar petak tidak tampak jelas. |
| Skala dunia | 1 tile = 10 × 10 meter = 100 m²; peta 125 × 125 tile = 1.250 × 1.250 meter = 1,5625 km² = 156,25 hektare. Skala ini adalah keputusan desain; ukuran visual aset dan mekanik belum dikalibrasi secara menyeluruh. |
| Renderer | Geometri 3D dirender dengan WebGL bila tersedia; ada renderer cadangan berbasis Canvas 2D yang memproyeksikan geometri 3D bila WebGL tidak tersedia. |
| Terrain | Kontur, warna rumput, alur sungai dan tepian dihasilkan secara prosedural. |
| Vegetasi | Pohon berkanopi dan palem dibentuk dari geometri prosedural; lokasi bervariasi berdasarkan seed. |
| Kamera | Desktop: drag kiri untuk geser, drag kanan untuk putar/miring, scroll untuk zoom. Sentuh: satu jari untuk geser; dua jari untuk zoom dan putar/miring. Arah geser vertikal dibalik, arah horizontal dipertahankan. |
| Gameplay | Settlement sawah dan kayu, jalan antardesa, stok, produksi/konsumsi, distribusi, pertumbuhan penduduk, pembangunan manual, tata ulang layout tiap lima bangunan, serta ringkasan tenaga kerja tersedia sebagai prototipe. |
| Variasi dunia | Tombol menghasilkan peta berdasarkan seed, termasuk bentuk air, bukit, hutan dan vegetasi; input seed memungkinkan membuka peta yang sama pada versi generator yang sama. |

**Batas saat ini:** Panel tenaga kerja hanya menghitung penduduk yang didukung kapasitas produksi dan sisa yang idle; belum ada simulasi atau penugasan villager individual. Pajak, pasar, perdagangan antardaerah, dan progresi kerajaan belum diimplementasikan. Renderer cadangan dapat lebih lambat, terutama saat geometri bertambah. Kompatibilitas seluruh perangkat belum diverifikasi.

## 4. Susunan kode

- `dist/index.html` — struktur halaman, kanvas dan kontrol.
- `dist/style.css` — tampilan antarmuka responsif, termasuk panel tenaga kerja.
- `dist/game.js` — renderer, terrain, kamera, interaksi, settlement, jalan dan antarmuka gameplay.
- `dist/assets.js` — bentuk dan variasi aset bangunan Majapahit.
- `dist/map.js` — generator terrain dan seed peta.
- `dist/simulation.js` — stok, produksi, konsumsi, kapasitas dan distribusi.
- `dist/village-layout.js` — penempatan tile, tata ulang desa, jalan lokal, migrasi dan penggabungan visual.
- `tests/village-layout.test.cjs` — tes layout, tabrakan, jalan dan migrasi.
- `ART_DIRECTION.md` — catatan arahan seni; `.openai/hosting.json` — konfigurasi hosting.

**Titik acuan sebelum checkpoint tenaga kerja:** GitHub `main` `3f9f09baf554561e30e7aa2f76008441721a8deb`; Site versi 25, sumber `a082b055eee87f698573b21765b370761fd4225e`. Checkpoint terbaru akan menautkan kedua sumber setelah sinkronisasi selesai.

## 5. Aturan ketika melanjutkan pengembangan

1. Ikuti instruksi terbaru pengguna dan batasi perubahan pada tahap yang diminta.
2. Pertahankan nuansa 3D CityRT-inspired dan identitas tropis Majapahit; perubahan besar arah seni perlu arahan pengguna.
3. Jaga terrain tampak menyatu dan grid 125 × 125 tetap berguna untuk gameplay.
4. Uji perubahan yang relevan: halaman terbuka, terrain terlihat, kamera berfungsi, dan perubahan tidak mengganggu fitur yang sudah ada. Catat jika pengujian visual atau perangkat tertentu belum dilakukan.
5. Saat fitur, aset atau keputusan desain baru disetujui, perbarui dokumen ini agar deskripsi dan kondisi kode tetap sesuai.


## 6. Checkpoint — Peta 125 × 125 disetujui

**Tanggal:** 23 November 2026  
**Status:** Pengguna menyatakan puas dengan versi saat ini dan meminta progres disimpan.

- Peta diperluas dari 50 × 50 (2.500 tile) menjadi **125 × 125 (15.625 tile)**, dengan ukuran setiap tile dipertahankan. Ini 6,25 kali jumlah tile semula.
- Warna rumput dan air halus dan menyatu; ada sungai, hutan tropis berkelompok, palem dan area terbuka. Skala pohon dipertahankan dan kepadatan vegetasi disesuaikan untuk peta lebih besar.
- Arah visual tetap maket 3D terinspirasi CityRT, diadaptasi menjadi Majapahit tropis.
- Kamera tetap menyediakan putar, zoom, geser dan reset. Variasi dunia menggunakan seed untuk mengubah distribusi vegetasi.
- Versi kode: `98a6281f4d2d1a00be478102dab1fb8478dbfedb`. [Buka prototipe](https://majapahit-terrain-ahs.vast-vine-9923.chatgpt.site).
- Validasi saat dibuat: kode JavaScript diperiksa dan pembuatan peta dijalankan dengan renderer simulasi; tampilan versi 125 × 125 belum diperiksa langsung melalui browser oleh asisten. Pengguna sudah melihat dan menyukai hasilnya.
- Ini adalah checkpoint visual terrain; pembangunan, jalan, ekonomi dan sistem gameplay lain belum diimplementasikan.

**Prosedur checkpoint:** Setiap kali pengguna secara eksplisit meminta checkpoint, perbarui dokumen ini pada file yang sama. Catat tanggal, persetujuan, perubahan, versi kode, pengujian dan batasan aktual.

## 7. Checkpoint — Generator peta dan perbukitan tinggi

**Tanggal:** 23 November 2026  
**Status:** Pengguna menyukai versi ini dan meminta checkpoint di GitHub.

- Peta 125 × 125 memiliki kategori logis terpisah: 781 tile air, 5.469 hutan, 781 bukit, dan 8.594 padang rumput; persentasenya mendekati 5%, 35%, 5%, dan 55%. Lereng dapat meluas secara visual ke kategori di sekitarnya.
- Generator berbasis seed membuat bentuk sungai, danau, kombinasi terhubung atau terpisah, dengan cabang sungai pada peta yang memiliki sungai. Hutan tersebar dan ada kelompok bukit 3D yang lebih tinggi dengan lereng sebagian berbatu.
- Seed dapat dimasukkan kembali melalui panel. Versi generator yang berubah dapat menghasilkan peta berbeda untuk seed yang dipakai pada versi sebelumnya.
- Kode checkpoint ini tersimpan bersama dokumen di commit GitHub yang memuat bagian ini. Commit sumber prototipe terpisah: `0c1871cc492c88738a9482e84f5760a1fc543a2c`.
- Validasi sebelumnya: 150 seed diuji untuk keterhubungan air, termasuk danau terpisah; jumlah kategori diperiksa pada 100 seed. Sintaks JavaScript diperiksa. Versi ini belum diperiksa langsung di browser oleh asisten, dan performa perangkat pengguna belum diukur; pengguna menyukai tampilannya.
- Tidak ada sistem bangunan, jalan atau ekonomi pada checkpoint ini.

## 8. Checkpoint — Skala dunia 10 × 10 meter per tile

**Tanggal:** 23 November 2026  
**Status:** Disetujui pengguna sebagai acuan skala.

- **1 tile = 10 × 10 meter**, dengan luas 100 m².
- Peta **125 × 125 tile** merepresentasikan area **1.250 × 1.250 meter** atau **1,5625 km² (156,25 hektare)**.
- Gunakan skala ini sebagai acuan untuk perencanaan ukuran bangunan, jalan, jarak dan lahan pada tahap berikutnya. Ukuran spesifik dan mekanik tiap aset menunggu arahan pengguna.
- Keputusan ini merupakan ketentuan desain; tidak ada perubahan kode, ukuran visual aset atau kalibrasi pengukuran pada checkpoint ini.


## 9. Checkpoint — Kalibrasi ukuran aset sementara

**Tanggal:** 23 November 2026  
**Status:** Acuan awal untuk diperiksa dan disesuaikan, bukan ukuran final aset.

- Skala dunia tetap **1 tile = 10 × 10 meter**. Satu tile adalah area lahan, bukan ukuran satu pohon; jumlah dan ukuran pohon dalam sebuah tile dapat bervariasi.
- Ukuran pohon pada prototipe dibentuk berdasarkan tampilan visual sebelum skala meter diputuskan. Proporsinya terhadap tile, manusia dan bangunan belum dikalibrasi.
- Acuan awal untuk evaluasi: manusia dewasa sekitar 1,7 m; rumah sederhana lebar sekitar 5–10 m; pohon kecil–sedang tinggi sekitar 5–12 m; pohon besar sekitar 15–25 m atau lebih. Rentang ini adalah ilustrasi, belum menjadi spesifikasi final atau ketentuan gameplay.
- Buat atau gunakan figur manusia dan model rumah sebagai pembanding saat aset tersebut dikerjakan. Pertimbangkan variasi ukuran pohon, termasuk mempertahankan beberapa pohon besar. Proporsi visual boleh sedikit distilisasi agar terbaca dari kamera atas.
- Ukuran akhir aset, jumlah pohon per tile dan perubahan visual akan diputuskan setelah evaluasi dan arahan pengguna. Checkpoint ini hanya mencatat rencana; tidak ada perubahan kode atau aset.


## 10. Checkpoint — Studi aset Majapahit

**Tanggal:** 23 November 2026  
**Status:** Pengguna menyukai versi detail bertahap dan meminta checkpoint GitHub.

- Sebelas variasi aset 3D: rumah rakyat 1 × 1, 2 × 2, 2 × 3, 4 × 4 dan 4 × 6 tile; sawah 1 × 1, 4 × 4 dan 8 × 8 tile; lumber house 1 × 1, 2 × 2 dan 4 × 4 tile.
- Ukuran yang lebih besar menampilkan kompleks dan detail bertahap, seperti halaman, gerbang, sumur, saung, pengairan, bengkel dan penyimpanan kayu. Arahan visual mengikuti referensi konsep Majapahit pengguna dan style game yang sudah ada.
- Aset berada di area studi pada peta; pemain dapat memilih aset untuk mendekatkan kamera, kembali ke tampilan area atau menyembunyikan studi aset. Ini merupakan studi visual, bukan mekanik penempatan, produksi atau upgrade.
- Skala acuan tetap 10 × 10 meter per tile. Proporsi manusia, pohon dan bangunan masih perlu dikalibrasi.
- Commit sumber prototipe terpisah: `d64649f9cee37e5c738fa3743e8e379ad3104ceb`. Kode dan dokumen checkpoint tersedia bersama pada commit GitHub yang memuat bagian ini.
- Validasi: sintaks ketiga file JavaScript diperiksa; uji simulasi memuat 11 aset, label dan pemilih. Versi ini belum diperiksa langsung di browser oleh asisten; pengguna telah melihat dan menyukainya.


## 11. Checkpoint — Informasi tenaga kerja desa

**Tanggal:** 25 November 2026. Pengguna meminta panel desa menampilkan villager yang bekerja dan idle karena kapasitas produksi belum mencukupi.

- Detail desa menunjukkan jumlah **Bekerja penuh** dan **Idle**. Perhitungan menggunakan populasi, kapasitas produksi bangunan spesialisasi, dan aturan produksi per penduduk yang sudah berlaku; jumlah pekerja penuh dibulatkan ke bawah.
- Panel turut memperkirakan jumlah tile produksi 1×1 tambahan untuk kapasitas kerja seluruh penduduk: farm untuk desa pangan, rumah kayu untuk desa kayu.
- Fitur hanya informasi. Tidak mengubah ekonomi, populasi, stok, biaya, produksi, kapasitas, distribusi, pertumbuhan, atau tata letak. Tidak membuat simulasi villager individual.
- Validasi: `node --check dist/game.js` lulus saat persiapan publikasi; Site versi 26 berhasil dideploy dan halaman dimuat. Asisten belum memverifikasi panel setelah memilih desa; pengguna diminta mencoba hasilnya.
- Sumber Site versi 26: `ff16803eac609a7a74a052244d068bd5dbc19937`, deployment berhasil `appgdep_6b06c5acd8ac8191941247af55db0c60`. GitHub code checkpoint: [`6a0add0dfe7290cafbbfedf610555785a1c7c839`](https://github.com/ardhifacebook-beep/Majapahit/commit/6a0add0dfe7290cafbbfedf610555785a1c7c839).
- [Coba Tanah Majapahit](https://majapahit-terrain-ahs.vast-vine-9923.chatgpt.site).
