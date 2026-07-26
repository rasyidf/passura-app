# Requirements Document

## Introduction

Fitur ini memperbarui tampilan dan fungsionalitas sidebar pada aplikasi Passura. Perubahan mencakup empat area utama: (1) dropdown user card yang lebih ringkas dengan Theme Toggle dan tombol Keluar, (2) penggantian nama grup navigasi "Akun" menjadi "Konfigurasi" dengan tambahan dua item navigasi baru (Backup dan Sinkronisasi), (3) footer status sistem yang ringkas menggantikan `SyncStatusBar`, dan (4) `ThemeProvider` baru untuk manajemen tema terang/gelap/sistem yang dipersistkan di `localStorage` dan diwire ke `__root.tsx`.

## Glossary

- **Sidebar**: Komponen `src/components/layout/Sidebar.tsx` yang menampilkan navigasi utama aplikasi.
- **ThemeProvider**: Context React baru di `src/contexts/ThemeContext.tsx` yang mengelola state tema aplikasi.
- **Theme**: Mode tampilan aplikasi — satu dari tiga nilai: `light`, `dark`, atau `system`.
- **SystemHealthFooter**: Komponen footer baru `src/components/layout/SystemHealthFooter.tsx` yang menampilkan status sistem secara ringkas, menggantikan `SyncStatusBar`.
- **SyncStatusBar**: Komponen lama `src/components/layout/SyncStatusBar.tsx` yang akan digantikan oleh `SystemHealthFooter`.
- **UserCardDropdown**: Area user card di bagian bawah Sidebar yang dilengkapi dropdown berisi Theme Toggle dan tombol Keluar.
- **NavGroup Konfigurasi**: Grup navigasi dengan label "Konfigurasi" yang menggantikan grup "Akun", berisi item Pengaturan, Backup, dan Sinkronisasi.
- **useSync**: Hook yang mengekspos `state`, `pendingCount`, `lastSyncAt`, `sync`, dan `countPending`.
- **elder**: Objek pengguna yang tersedia dari `useAuth()`, memiliki properti `name`, `email`, dan `role`.

---

## Requirements

### Requirement 1: ThemeProvider Context

**User Story:** Sebagai pengguna, saya ingin memilih tema tampilan (terang, gelap, atau mengikuti sistem), sehingga antarmuka aplikasi nyaman digunakan sesuai preferensi dan kondisi pencahayaan.

#### Acceptance Criteria

1. THE **ThemeProvider** SHALL menyediakan nilai state `theme` bertipe `'light' | 'dark' | 'system'` melalui React context kepada seluruh komponen turunannya.
2. THE **ThemeProvider** SHALL menyediakan fungsi `setTheme` yang menerima nilai `'light' | 'dark' | 'system'` untuk mengubah tema aktif.
3. WHEN **ThemeProvider** diinisialisasi, THE **ThemeProvider** SHALL membaca nilai tema dari `localStorage` dengan kunci `'passura-theme'` sebagai tema awal; jika nilai tidak ditemukan atau bukan salah satu dari `'light'`, `'dark'`, atau `'system'`, nilai awal adalah `'system'`.
4. WHEN nilai `theme` berubah, THE **ThemeProvider** SHALL menyimpan nilai baru ke `localStorage` dengan kunci `'passura-theme'`.
5. WHILE `theme` bernilai `'dark'`, THE **ThemeProvider** SHALL memastikan kelas `dark` ada pada elemen `<html>` dan tidak ada kelas lain yang bertentangan dengannya.
6. WHILE `theme` bernilai `'light'`, THE **ThemeProvider** SHALL memastikan kelas `dark` tidak ada pada elemen `<html>`.
7. WHILE `theme` bernilai `'system'`, THE **ThemeProvider** SHALL menambahkan kelas `dark` pada elemen `<html>` apabila `prefers-color-scheme: dark` aktif di sistem operasi, dan menghapus kelas `dark` apabila tidak aktif; perubahan OS preference saat runtime HARUS langsung diterapkan tanpa perlu reload halaman menggunakan `MediaQueryList.addEventListener`.
8. THE **ThemeProvider** SHALL dibungkus di dalam `RootComponent` pada `src/routes/__root.tsx`, menyelimuti seluruh komponen turunan termasuk `QueryClientProvider` dan `AuthProvider`.
9. IF fungsi `setTheme` dipanggil dengan nilai yang bukan `'light'`, `'dark'`, atau `'system'`, THE **ThemeProvider** SHALL mengabaikan panggilan tersebut tanpa mengubah state tema atau `localStorage`.

---

### Requirement 2: UserCard Dropdown dengan Theme Toggle dan Keluar

**User Story:** Sebagai pengguna, saya ingin mengakses pengaturan tema dan tombol keluar dari user card di sidebar, sehingga aksi-aksi tersebut terorganisir dalam satu tempat yang rapi.

#### Acceptance Criteria

1. THE **Sidebar** SHALL menampilkan `UserCardDropdown` di bagian bawah sidebar, berisi avatar inisial satu karakter huruf kapital dari `elder.name`, nama lengkap dari `elder.name`, dan email dari `elder.email`; jika `elder` adalah `null`, SHALL menampilkan fallback inisial `"U"`, nama `"Pengguna"`, dan email `"-"`.
2. WHEN pengguna mengklik `UserCardDropdown`, THE **Sidebar** SHALL menampilkan dropdown menu menggunakan komponen `DropdownMenu` dari `src/components/ui/dropdown-menu.tsx` yang muncul di atas trigger (side="top" atau align ke tepi sidebar).
3. THE **Sidebar** SHALL menampilkan item "Tema" di dalam dropdown yang, ketika diklik, bersiklus melalui urutan tema: `light` → `dark` → `system` → `light` menggunakan fungsi `setTheme` dari `ThemeProvider`.
4. THE **Sidebar** SHALL menampilkan item "Keluar" di dalam dropdown yang memanggil fungsi `logout` dari `useAuth()` ketika diklik, dengan ikon `LogOut` dari lucide-react.
5. IF tombol "Keluar" berdiri sendiri (`standalone Keluar button`) ada di luar dropdown, THE **Sidebar** SHALL menghapusnya sehingga tidak ada duplikasi aksi keluar.
6. WHEN tema aktif adalah `'light'`, THE **Sidebar** SHALL menampilkan ikon `Sun` dari lucide-react pada item Tema di dropdown beserta label `"Terang"`.
7. WHEN tema aktif adalah `'dark'`, THE **Sidebar** SHALL menampilkan ikon `Moon` dari lucide-react pada item Tema di dropdown beserta label `"Gelap"`.
8. WHEN tema aktif adalah `'system'`, THE **Sidebar** SHALL menampilkan ikon `Monitor` dari lucide-react pada item Tema di dropdown beserta label `"Sistem"`.

---

### Requirement 3: Penggantian Nama NavGroup dan Penambahan Item Navigasi Konfigurasi

**User Story:** Sebagai administrator, saya ingin menemukan menu Backup dan Sinkronisasi di bawah grup "Konfigurasi", sehingga semua pengaturan sistem mudah ditemukan di satu grup yang relevan.

#### Acceptance Criteria

1. THE **Sidebar** SHALL mengganti label grup navigasi `"Akun"` menjadi `"Konfigurasi"` sehingga tidak ada lagi elemen dengan teks "Akun" pada heading grup navigasi.
2. THE **Sidebar** SHALL menampilkan item navigasi "Sinkronisasi" dengan path `/dashboard/sync` dan ikon `RefreshCw` dari lucide-react di dalam **NavGroup Konfigurasi**.
3. THE **Sidebar** SHALL menampilkan item navigasi "Backup" dengan path `/dashboard/backup` dan ikon `HardDrive` dari lucide-react di dalam **NavGroup Konfigurasi**.
4. THE **Sidebar** SHALL menampilkan item navigasi "Pengaturan" dengan path `/dashboard/profile` yang sudah ada tetap berada di dalam **NavGroup Konfigurasi** dengan ikon `Settings` yang sudah ada.
5. THE **Sidebar** SHALL menampilkan urutan item dalam **NavGroup Konfigurasi** secara berurutan: Pengaturan, Backup, Sinkronisasi — diverifikasi dengan urutan DOM dari kiri ke atas ke bawah.
6. WHEN pengguna berada pada path `/dashboard/sync` atau `/dashboard/backup`, THE **Sidebar** SHALL menerapkan gaya aktif (`bg-primary/10 text-primary font-medium`) pada item navigasi yang sesuai, konsisten dengan gaya aktif item navigasi lainnya.

---

### Requirement 4: SystemHealthFooter Menggantikan SyncStatusBar

**User Story:** Sebagai pengguna, saya ingin melihat ringkasan status kesehatan sistem di bagian bawah sidebar, sehingga saya mengetahui status konektivitas dan sinkronisasi tanpa membuka halaman tersendiri.

#### Acceptance Criteria

1. THE **Sidebar** SHALL menampilkan **SystemHealthFooter** di posisi paling bawah sidebar, menggantikan `SyncStatusBar`.
2. THE **SystemHealthFooter** SHALL menampilkan indikator dot berwarna untuk keterjangkauan server, dengan warna hijau (`bg-green-500`) apabila server dapat dijangkau dan warna merah (`bg-red-500`) apabila tidak dapat dijangkau.
3. THE **SystemHealthFooter** SHALL melakukan HTTP HEAD request ke endpoint `/api/health` (atau `VITE_API_URL + /health`) dengan timeout 5 detik pada interval 30 detik; server dianggap terjangkau jika respons HTTP 200 diterima dalam 5 detik.
4. THE **SystemHealthFooter** SHALL menampilkan indikator konektivitas internet berdasarkan nilai `navigator.onLine` dan SHALL memperbarui indikator secara reaktif menggunakan event listener `window.addEventListener('online', ...)` dan `window.addEventListener('offline', ...)`.
5. WHEN `pendingCount` dari `useSync` lebih dari nol, THE **SystemHealthFooter** SHALL menampilkan jumlah item yang menunggu sinkronisasi dalam format `"{n} pending"`.
6. WHEN `pendingCount` dari `useSync` bernilai nol, THE **SystemHealthFooter** SHALL tidak menampilkan penghitung pending.
7. WHEN `lastSyncAt` dari `useSync` bukan `null`, THE **SystemHealthFooter** SHALL menampilkan waktu sinkronisasi terakhir menggunakan `lastSyncAt.toLocaleTimeString('id-ID')`.
8. THE **SystemHealthFooter** SHALL menggunakan layout satu baris (`flex flex-row`) dengan tinggi maksimum 40px untuk seluruh kontennya.
9. IF komponen `SyncStatusBar` tidak lagi digunakan oleh `Sidebar`, THE **Sidebar** SHALL tidak mengimpor atau merender `SyncStatusBar`.
