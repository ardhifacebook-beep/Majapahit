# Arahan visual — Game AHS: Majapahit

Arahan pengguna, 24 November 2026. Referensi visual meliputi CityRT dan gambar County of Fortune yang diberikan pengguna. Referensi menjadi arah komposisi, bukan algoritma yang diasumsikan atau aset yang disalin.

- Dunia browser 3D bergaya stylized low-to-mid poly: bentuk bersih, seperti maket arsitektur, warna cerah hangat dan pencahayaan lembut.
- Permukaan tanah dan air halus, warna menyatu, kontur ringan, tidak tampak terpetak; grid 125 × 125 tetap untuk logika gameplay.
- Adaptasi geografis tropis Jawa: hutan hijau berkelompok, pohon berkanopi lebar dan palem, sungai alami, area terbuka yang mudah dibaca.
- Untuk bangunan di tahap selanjutnya: ekspresi arsitektur Majapahit / Jawa, geometri rapi, siluet dan detail arsitektur terbaca pada sudut kamera city builder. Material dan warna hangat seperti bata merah, kayu dan atap tanah; rincian aset menunggu arahan pengguna.
- Kesan ringan dan nyaman; menjaga performa browser. Hindari tekstur fotorealistis berat dan rumput 3D berlebihan.
- Layout desa memakai lingkaran bertahap yang dimulai rapat di sekitar pusat lalu melebar saat kelompok bertambah. Bangunan kecil dari jenis yang sama dikemas sebagai blok tile 2×2 yang rapi; bangunan besar tetap memakai footprint aslinya. Rumah berada di lapisan dalam, sementara farm atau rumah kayu berada lebih ke luar. Variasi arah, jarak, dan jalan dibuat halus mengikuti lahan sehingga bentuknya tidak menjadi cincin atau pola radial yang kaku.
- Jalan lokal menggabungkan pelataran pusat, beberapa lengkung pendek di antara zona hunian dan kerja, serta gang akses yang tersambung. Lengkung boleh terputus atau berubah arah karena medan dan bangunan; hindari jalan penuh mengitari ruang kosong.
- Setiap lima bangunan baru, generator boleh menyusun ulang posisi seluruh bangunan serta jalan lokal agar desa tumbuh sebagai satu komposisi. Blok kecil merapat terlebih dahulu; lapisan melingkar berikutnya muncul ketika lapisan dalam mulai terisi. Identitas, jumlah, luas tile, biaya, kapasitas, produksi, stok, populasi, dan kiriman tidak berubah.
- Jalan antardesa tetap menjadi koneksi gameplay. Jalan utama desa mengarah dari pusat ke akses tersebut; gang dan akses pendek menyatu dengan kelompok rumah, lahan kerja dan kondisi terrain.
- Tata letak menggunakan variasi deterministik dan disimpan. Pembangunan baru menjadi pemicu penataan berkala; pergantian hari atau render tidak mengacak desa.
- Aset rumah, sawah, dan rumah kayu yang lebih besar boleh menyatukan beberapa petak secara visual hanya bila footprint cocok. Penggabungan tampilan tidak mengubah luas ekonomi bangunan.
