# Implementation Plan: Sidebar UI Enhancements

## Overview

Implementasi dilakukan dalam empat area utama: (1) membuat `ThemeContext.tsx` baru sebagai provider tema, (2) mengintegrasikan `ThemeProvider` ke `__root.tsx`, (3) memperbarui `Sidebar.tsx` dengan `UserCardDropdown`, pembaruan `navGroups`, dan `SystemHealthFooter`, serta (4) membuat komponen `SystemHealthFooter.tsx` baru.

## Tasks

- [x] 1. Buat ThemeContext dan ThemeProvider
  - [x] 1.1 Buat file `src/contexts/ThemeContext.tsx` dengan tipe `Theme`, context, hook `useTheme`, dan komponen `ThemeProvider`
    - Implementasikan `getInitialTheme()` yang membaca `localStorage['passura-theme']` dengan fallback ke `'system'`
    - Bungkus read localStorage dalam try/catch untuk ketahanan SSR/private mode
    - Implementasikan efek untuk memanipulasi kelas `dark` pada `document.documentElement` berdasarkan nilai tema
    - Untuk tema `'system'`, pasang listener `MediaQueryList.addEventListener('change', ...)` dan bersihkan saat cleanup
    - Implementasikan `setTheme` dengan guard: abaikan nilai yang bukan `'light' | 'dark' | 'system'`
    - Simpan nilai baru ke `localStorage['passura-theme']` saat `setTheme` berhasil
    - Ekspor hook `useTheme()` yang melempar error jika digunakan di luar `ThemeProvider`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.9_

  - [ ]* 1.2 Tulis property test untuk ThemeProvider — Property 1: Theme state selalu berupa nilai yang valid
    - **Property 1: Theme state selalu berupa nilai yang valid**
    - **Validates: Requirements 1.1, 1.3**
    - Gunakan fast-check dengan `fc.string()` untuk mensimulasikan berbagai nilai localStorage
    - Verifikasi bahwa `theme` selalu bernilai `'light'`, `'dark'`, atau `'system'` setelah inisialisasi

  - [ ]* 1.3 Tulis property test untuk ThemeProvider — Property 2: setTheme valid memperbarui state dan localStorage
    - **Property 2: setTheme dengan nilai valid memperbarui state dan localStorage**
    - **Validates: Requirements 1.2, 1.4**
    - Gunakan `fc.constantFrom('light', 'dark', 'system')` untuk input valid
    - Verifikasi `theme === value` dan `localStorage.getItem('passura-theme') === value` setelah panggilan

  - [ ]* 1.4 Tulis property test untuk ThemeProvider — Property 3: Kelas `dark` pada `<html>` konsisten
    - **Property 3: Kelas `dark` pada `<html>` konsisten dengan tema aktif**
    - **Validates: Requirements 1.5, 1.6, 1.7**
    - Verifikasi: `dark` ada saat tema `'dark'`, tidak ada saat `'light'`, mengikuti media query saat `'system'`

  - [ ]* 1.5 Tulis property test untuk ThemeProvider — Property 4: setTheme dengan nilai tidak valid diabaikan
    - **Property 4: setTheme dengan nilai tidak valid diabaikan**
    - **Validates: Requirements 1.9**
    - Gunakan `fc.string().filter(s => !['light','dark','system'].includes(s))` untuk input tidak valid
    - Verifikasi bahwa state dan localStorage tidak berubah setelah panggilan dengan nilai tidak valid

- [x] 2. Integrasikan ThemeProvider ke `__root.tsx`
  - [x] 2.1 Modifikasi `src/routes/__root.tsx` untuk membungkus seluruh children dengan `ThemeProvider`
    - Import `ThemeProvider` dari `src/contexts/ThemeContext.tsx`
    - Tempatkan `ThemeProvider` sebagai pembungkus terluar di dalam `RootDocument`, menyelimuti `QueryClientProvider` dan `AuthProvider`
    - _Requirements: 1.8_

- [x] 3. Checkpoint — Pastikan ThemeProvider dan integrasi root berjalan benar
  - Pastikan semua tes pada task 1 lulus dan TypeScript tidak mengeluarkan error pada `ThemeContext.tsx` dan `__root.tsx`.

- [x] 4. Perbarui `navGroups` dan UserCardDropdown di Sidebar
  - [x] 4.1 Ganti label grup navigasi `"Akun"` menjadi `"Konfigurasi"` dan tambahkan item Backup dan Sinkronisasi
    - Ubah `label: 'Akun'` menjadi `label: 'Konfigurasi'` pada `navGroups`
    - Tambahkan item `{ href: '/dashboard/backup', label: 'Backup', icon: <HardDrive className="size-4" /> }`
    - Tambahkan item `{ href: '/dashboard/sync', label: 'Sinkronisasi', icon: <RefreshCw className="size-4" /> }`
    - Pastikan urutan dalam grup: Pengaturan → Backup → Sinkronisasi
    - Import `HardDrive` dari lucide-react
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 4.2 Implementasikan `UserCardDropdown` di `Sidebar.tsx` dan hapus standalone button "Keluar"
    - Import `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuSeparator` dari `src/components/ui/dropdown-menu.tsx`
    - Import `useTheme` dari `src/contexts/ThemeContext.tsx`
    - Import `ChevronUp`, `Sun`, `Moon`, `Monitor`, `LogOut` dari lucide-react
    - Implementasikan helper `nextTheme(current)` dan konstanta `THEME_CYCLE` dan `THEME_META`
    - Buat trigger berupa button dengan avatar inisial, nama, email, dan ikon `ChevronUp`; terapkan fallback untuk `elder === null`
    - Buat `DropdownMenuContent` dengan `side="top"` berisi item Tema (dengan ikon + label dinamis) dan item Keluar
    - Hapus blok standalone button "Keluar" yang sudah ada
    - Ganti blok user card statis dengan `UserCardDropdown`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [ ]* 4.3 Tulis property test untuk UserCardDropdown — Property 5: Avatar inisial selalu benar
    - **Property 5: Avatar inisial UserCardDropdown selalu menampilkan karakter pertama yang benar**
    - **Validates: Requirements 2.1**
    - Gunakan `fc.string({ minLength: 1 })` untuk nilai `elder.name`
    - Verifikasi bahwa inisial yang dirender adalah `name[0].toUpperCase()`; jika `elder === null`, inisial harus `"U"`

  - [ ]* 4.4 Tulis property test untuk UserCardDropdown — Property 6: Theme cycle deterministik
    - **Property 6: Theme cycle deterministik**
    - **Validates: Requirements 2.3**
    - Gunakan `fc.constantFrom('light', 'dark', 'system')` sebagai tema awal
    - Verifikasi urutan siklus: `light → dark → system → light` setiap kali item Tema diklik

  - [ ]* 4.5 Tulis property test untuk UserCardDropdown — Property 7: Ikon dan label Tema mencerminkan tema aktif
    - **Property 7: Ikon dan label Tema mencerminkan tema aktif**
    - **Validates: Requirements 2.6, 2.7, 2.8**
    - Untuk setiap nilai tema valid, verifikasi ikon (`Sun`/`Moon`/`Monitor`) dan label (`Terang`/`Gelap`/`Sistem`) yang dirender

  - [ ]* 4.6 Tulis property test untuk gaya aktif navigasi — Property 8: Gaya aktif navigasi konsisten
    - **Property 8: Gaya aktif navigasi konsisten untuk semua item nav**
    - **Validates: Requirements 3.6**
    - Untuk setiap path di `navGroups`, simulasikan pathname yang cocok
    - Verifikasi bahwa hanya item yang pathnya cocok memiliki kelas `bg-primary/10 text-primary font-medium`

- [x] 5. Checkpoint — Pastikan perubahan Sidebar berjalan benar
  - Pastikan semua tes pada task 4 lulus, TypeScript tidak ada error di `Sidebar.tsx`, dan semua item nav terrender dengan benar.

- [x] 6. Buat komponen `SystemHealthFooter`
  - [x] 6.1 Buat file `src/components/layout/SystemHealthFooter.tsx`
    - Import `useSync` dari hook yang sudah ada
    - Implementasikan state lokal `serverReachable` (boolean | null) dan `isOnline` (diinisialisasi dari `navigator.onLine`)
    - Implementasikan efek health check: HEAD request ke `${VITE_API_URL}/api/health` dengan `AbortController` timeout 5 detik, diulang setiap 30 detik menggunakan `setInterval`
    - Implementasikan efek listener `online`/`offline` pada `window` untuk memperbarui `isOnline` secara reaktif
    - Panggil `countPending()` dari `useSync` pada mount dan saat event `focus`
    - Render layout satu baris `flex flex-row` dengan `maxHeight: 40` berisi: server dot (hijau/merah), ikon `Wifi`/`WifiOff`, teks pending (`{n} pending`) jika `pendingCount > 0`, dan waktu sinkronisasi terakhir menggunakan `lastSyncAt.toLocaleTimeString('id-ID')`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [ ]* 6.2 Tulis property test untuk SystemHealthFooter — Property 9: Server dot mencerminkan status keterjangkauan
    - **Property 9: Indikator server dot mencerminkan status keterjangkauan**
    - **Validates: Requirements 4.2**
    - Mock state `serverReachable` dengan `fc.boolean()`
    - Verifikasi kelas `bg-green-500` saat reachable dan `bg-red-500` saat tidak reachable

  - [ ]* 6.3 Tulis property test untuk SystemHealthFooter — Property 10: Indikator online reaktif
    - **Property 10: Indikator online mencerminkan navigator.onLine secara reaktif**
    - **Validates: Requirements 4.4**
    - Gunakan `fc.boolean()` untuk nilai `isOnline`
    - Verifikasi bahwa ikon `Wifi` ditampilkan saat online dan `WifiOff` saat offline

  - [ ]* 6.4 Tulis property test untuk SystemHealthFooter — Property 11: Teks pending count tampil jika dan hanya jika pendingCount > 0
    - **Property 11: Teks pending count tampil jika dan hanya jika pendingCount > 0**
    - **Validates: Requirements 4.5, 4.6**
    - Gunakan `fc.nat()` untuk nilai `pendingCount`
    - Verifikasi teks `"{n} pending"` tampil saat `pendingCount > 0` dan tidak tampil saat `pendingCount === 0`

  - [ ]* 6.5 Tulis property test untuk SystemHealthFooter — Property 12: Waktu sinkronisasi terakhir sesuai format
    - **Property 12: Waktu sinkronisasi terakhir ditampilkan sesuai format**
    - **Validates: Requirements 4.7**
    - Gunakan `fc.date()` untuk nilai `lastSyncAt` yang bukan null
    - Verifikasi teks yang dirender identik dengan `lastSyncAt.toLocaleTimeString('id-ID')`

- [x] 7. Ganti `SyncStatusBar` dengan `SystemHealthFooter` di `Sidebar.tsx`
  - [x] 7.1 Hapus import `SyncStatusBar` dari `Sidebar.tsx` dan ganti dengan import `SystemHealthFooter`; render `<SystemHealthFooter />` di posisi yang sama di bawah `navContent`
    - Pastikan `SyncStatusBar` tidak lagi diimpor atau dirender di `Sidebar.tsx`
    - _Requirements: 4.1, 4.9_

- [x] 8. Checkpoint akhir — Pastikan semua tes lulus
  - Pastikan semua tes lulus, tidak ada error TypeScript di seluruh file yang dimodifikasi, dan semua requirements tercakup.

## Notes

- Tasks bertanda `*` bersifat opsional dan bisa dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk keterlacakan
- `SyncStatusBar.tsx` tidak dihapus — hanya tidak lagi diimpor oleh Sidebar
- Property test menggunakan Vitest + fast-check sesuai stack proyek
- Route `/dashboard/backup` dan `/dashboard/sync` belum didaftarkan — hanya nav entries; ini disengaja dan di luar scope

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5", "2.1"] },
    { "id": 2, "tasks": ["4.1", "4.2", "6.1"] },
    { "id": 3, "tasks": ["4.3", "4.4", "4.5", "4.6", "6.2", "6.3", "6.4", "6.5"] },
    { "id": 4, "tasks": ["7.1"] }
  ]
}
```
