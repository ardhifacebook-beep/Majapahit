# Game AHS — Pedoman Visual dan Fondasi Kode

**Proyek:** County builder 3D berlatar Majapahit, dapat dimainkan di browser  
**Status:** Acuan pengembangan yang disepakati, checkpoint generator peta, perbukitan tinggi, dan sungai bercabang  
**Tanggal:** 23 November 2026  
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

### Bangunan pada tahap mendatang

- Ambil bahasa visual bersih seperti maket city builder, lalu sesuaikan dengan konteks Majapahit/Jawa.
- Rencanakan siluet dan detail arsitektur yang tetap terbaca dari sudut kamera permainan. Bata merah, kayu, dan warna tanah dapat menjadi eksplorasi awal, dengan desain spesifik menunggu arahan pengguna.
- Jangan menambahkan desain bangunan, mekanik, ukuran atau sistem konstruksi sebagai keputusan final tanpa arahan pengguna.
- Bangunan modular dan mengikuti jalan melengkung adalah kemungkinan eksplorasi, belum merupakan fitur yang disetujui.

## 3. Fondasi teknis prototipe saat ini

| Komponen | Kondisi saat ini |
| --- | --- |
| Platform | Halaman web statis dengan HTML, CSS, dan JavaScript. |
| Peta | Wilayah logis 125 × 125 tile, total 15.625 tile; ukuran setiap tile tetap sama seperti versi 50 × 50. Warna terrain menggunakan transisi halus agar petak tidak tampak jelas. |
| Renderer | Geometri 3D dirender dengan WebGL bila tersedia; ada renderer cadangan berbasis Canvas 2D yang memproyeksikan geometri 3D bila WebGL tidak tersedia. |
| Terrain | Kontur, warna rumput, alur sungai dan tepian dihasilkan secara prosedural. |
| Vegetasi | Pohon berkanopi dan palem dibentuk dari geometri prosedural; lokasi bervariasi berdasarkan seed. |
| Kamera | Putar dengan drag, zoom dengan scroll, geser dengan Shift + drag, dan reset dengan tombol. |
| Tile | Klik menampilkan perkiraan lokasi tile dan klasifikasi darat/sungai; pemilihan saat ini memakai pendekatan bidang datar sehingga belum presisi untuk kontur atau objek yang lebih kompleks. |
| Variasi dunia | Tombol menghasilkan peta berdasarkan seed, termasuk bentuk air, bukit, hutan dan vegetasi; input seed memungkinkan membuka peta yang sama pada versi generator yang sama. |

**Batas saat ini:** Ini prototipe visual, belum mencakup bangunan, ekonomi, penduduk, jalan, penyimpanan permainan, atau sistem konstruksi. Renderer cadangan dapat lebih lambat, terutama saat geometri bertambah. Tidak ada klaim performa atau kompatibilitas pada semua perangkat tanpa pengujian.

## 4. Susunan kode

> Kode prototipe checkpoint telah disalin ke repository GitHub ini. Commit berawalan `98a6281` di bawah merujuk ke repository sumber prototipe terpisah, bukan riwayat GitHub ini.

- `dist/index.html` — struktur halaman, kanvas dan kontrol.
- `dist/style.css` — tampilan antarmuka dan penyesuaian ukuran layar.
- `dist/game.js` — pembuatan geometri terrain dan pepohonan, pewarnaan, renderer, kamera dan interaksi prototipe.
- `dist/map.js` — generator peta berbasis seed, tipe terrain dan bentuk bentang alam.
- `ART_DIRECTION.md` — catatan singkat arahan seni di dalam proyek.
- Konfigurasi hosting milik proyek prototipe terpisah dan tidak disalin ke repository ini.

Kode prototipe saat ini menggunakan `game.js` dan `map.js`. Saat kompleksitas bertambah, pisahkan generator terrain, aset, renderer, kamera, interaksi dan state secara bertahap tanpa mengubah arah visual atau mekanik yang disetujui. Simpan grid logis terpisah dari tampilan permukaan sehingga tile tidak harus terlihat sebagai kotak.

**Titik acuan sumber prototipe saat ini:** commit `0c1871cc492c88738a9482e84f5760a1fc543a2c`, generator peta dengan perbukitan tinggi. Versi peta 125 × 125 sebelumnya: `98a6281f4d2d1a00be478102dab1fb8478dbfedb`. Titik acuan sebelumnya: `1b121b7a14ab1c8153e2007ed6a79fdfa3a1c9b7` untuk style tropis awal. Commit tersebut adalah identitas versi di repository asal. Kode checkpoint juga tersedia di repository GitHub ini.

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
