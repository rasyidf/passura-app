# Design Document: Sidebar UI Enhancements

## Overview

Dokumen ini mendefinisikan arsitektur dan implementasi perubahan UI sidebar Passura, mencakup empat area: ThemeProvider untuk manajemen tema, UserCardDropdown dengan integrasi theme toggle dan logout, pembaruan grup navigasi Konfigurasi, dan SystemHealthFooter sebagai pengganti SyncStatusBar.

Stack yang digunakan: React 19, TypeScript, TailwindCSS v4, TanStack Router, shadcn/ui (Radix UI), Lucide React, Vitest + fast-check.

---

## Architecture

```
src/
├── contexts/
│   └── ThemeContext.tsx          # NEW — ThemeProvider + useTheme hook
├── components/
│   └── layout/
│       ├── Sidebar.tsx           # MODIFIED — UserCardDropdown, navGroups, SystemHealthFooter
│       ├── SystemHealthFooter.tsx# NEW — replaces SyncStatusBar
│       └── SyncStatusBar.tsx     # UNCHANGED (deprecated, no longer imported by Sidebar)
└── routes/
    └── __root.tsx                # MODIFIED — wraps children with ThemeProvider
```

**Data flow:**

```
__root.tsx
  └─ ThemeProvider (manages theme state + <html> class + localStorage)
       └─ QueryClientProvider
            └─ AuthProvider
                 └─ Outlet → (dashboard layout) → Sidebar
                                                      ├─ navContent
                                                      │    ├─ navGroups (Konfigurasi group)
                                                      │    └─ UserCardDropdown (useTheme + useAuth)
                                                      └─ SystemHealthFooter (useSync + fetch /api/health)
```

---

## Component Design

### 1. ThemeContext (`src/contexts/ThemeContext.tsx`)

Bertanggung jawab tunggal: menyimpan state tema, mensinkronkan ke localStorage, dan memanipulasi kelas `dark` pada `document.documentElement`.

```typescript
type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}
```

**Initialization logic:**

```typescript
function getInitialTheme(): Theme {
  const stored = localStorage.getItem('passura-theme');
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}
```

**`<html>` class effect (runs on every `theme` change):**

```typescript
useEffect(() => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    return;
  }
  if (theme === 'light') {
    root.classList.remove('dark');
    return;
  }
  // theme === 'system'
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const apply = (matches: boolean) =>
    matches ? root.classList.add('dark') : root.classList.remove('dark');
  apply(mql.matches);
  mql.addEventListener('change', (e) => apply(e.matches));
  return () => mql.removeEventListener('change', (e) => apply(e.matches));
}, [theme]);
```

**`setTheme` guard — invalid values are silently ignored:**

```typescript
const setTheme = useCallback((next: Theme) => {
  if (next !== 'light' && next !== 'dark' && next !== 'system') return;
  setThemeState(next);
  localStorage.setItem('passura-theme', next);
}, []);
```

**Export hook:**

```typescript
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
```

---

### 2. `__root.tsx` — Wiring ThemeProvider

`ThemeProvider` membungkus seluruh child dari `RootComponent`, di luar `QueryClientProvider` agar tema aktif sebelum React Query dan auth diinisialisasi:

```typescript
function RootComponent() {
  return (
    <RootDocument>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Outlet />
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </RootDocument>
  );
}
```

---

### 3. UserCardDropdown (inline di `Sidebar.tsx`)

Komponen ini menggantikan blok `<div className="mt-auto p-3 ...">` yang sebelumnya berisi standalone button "Keluar" dan user card statis. Komponen diimplementasikan sebagai fungsi lokal di Sidebar.tsx (tidak perlu file terpisah karena sederhana).

**Props yang dibutuhkan:** tidak ada — mengambil langsung dari `useAuth()` dan `useTheme()`.

**Struktur JSX:**

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="w-full flex items-center gap-3 rounded-lg border p-3 hover:bg-muted transition-colors text-left">
      {/* Avatar inisial */}
      <div className="size-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-medium text-sm shrink-0">
        {elder?.name?.[0]?.toUpperCase() ?? 'U'}
      </div>
      {/* Nama + Email */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{elder?.name ?? 'Pengguna'}</div>
        <div className="truncate text-xs text-muted-foreground">{elder?.email ?? '-'}</div>
      </div>
      <ChevronUp className="size-4 text-muted-foreground shrink-0" />
    </button>
  </DropdownMenuTrigger>

  <DropdownMenuContent side="top" align="end" className="w-[220px]">
    <DropdownMenuItem onClick={handleThemeCycle}>
      <ThemeIcon className="size-4" />
      <span>{themeLabel}</span>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
      <LogOut className="size-4" />
      <span>Keluar</span>
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

**Theme cycle helper:**

```typescript
const THEME_CYCLE: Theme[] = ['light', 'dark', 'system'];

function nextTheme(current: Theme): Theme {
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
}

const handleThemeCycle = () => setTheme(nextTheme(theme));
```

**Theme icon/label mapping:**

```typescript
const THEME_META: Record<Theme, { icon: React.ComponentType; label: string }> = {
  light:  { icon: Sun,     label: 'Terang' },
  dark:   { icon: Moon,    label: 'Gelap'  },
  system: { icon: Monitor, label: 'Sistem' },
};
```

---

### 4. NavGroups — Rename + Tambah Item Konfigurasi

Perubahan murni pada array `navGroups` di Sidebar.tsx:

```typescript
const navGroups: NavGroup[] = [
  // ... (Dasbor, Komunitas, Transaksi, Referensi tidak berubah)
  {
    label: 'Konfigurasi',          // was: 'Akun'
    items: [
      { href: '/dashboard/profile', label: 'Pengaturan', icon: <Settings className="size-4" /> },
      { href: '/dashboard/backup',  label: 'Backup',     icon: <HardDrive className="size-4" /> },
      { href: '/dashboard/sync',    label: 'Sinkronisasi', icon: <RefreshCw className="size-4" /> },
    ],
  },
];
```

Catatan: `/dashboard/backup` dan `/dashboard/sync` adalah nav entries saja — tidak ada route baru yang didaftarkan dalam scope ini. Link akan tetap berfungsi sebagai navigasi meskipun halaman tujuannya belum ada.

---

### 5. SystemHealthFooter (`src/components/layout/SystemHealthFooter.tsx`)

Komponen ini menggantikan `<SyncStatusBar />` di bawah `navContent` dalam Sidebar.

**State lokal:**

```typescript
const [serverReachable, setServerReachable] = useState<boolean | null>(null);
const [isOnline, setIsOnline] = useState(() => navigator.onLine);
```

**Server health check (HEAD ke `/api/health`, timeout 5 detik, interval 30 detik):**

```typescript
useEffect(() => {
  const check = async () => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const base = import.meta.env.VITE_API_URL ?? '';
      const res = await fetch(`${base}/api/health`, {
        method: 'HEAD',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      setServerReachable(res.ok);
    } catch {
      setServerReachable(false);
    }
  };

  check();
  const id = setInterval(check, 30_000);
  return () => clearInterval(id);
}, []);
```

**Online/offline listener:**

```typescript
useEffect(() => {
  const onOnline  = () => setIsOnline(true);
  const onOffline = () => setIsOnline(false);
  window.addEventListener('online',  onOnline);
  window.addEventListener('offline', onOffline);
  return () => {
    window.removeEventListener('online',  onOnline);
    window.removeEventListener('offline', onOffline);
  };
}, []);
```

**Rendered JSX (satu baris, max-height 40px):**

```tsx
<div className="flex flex-row items-center gap-2 px-3 border-t text-xs text-muted-foreground" style={{ maxHeight: 40, minHeight: 32 }}>
  {/* Server dot */}
  <span
    className={cn('size-2 rounded-full shrink-0', serverReachable ? 'bg-green-500' : 'bg-red-500')}
    title={serverReachable ? 'Server terjangkau' : 'Server tidak terjangkau'}
  />
  {/* Online indicator */}
  {isOnline
    ? <Wifi className="size-3 text-green-600" />
    : <WifiOff className="size-3 text-red-500" />
  }
  {/* Pending */}
  {pendingCount > 0 && (
    <span className="text-orange-600">{pendingCount} pending</span>
  )}
  {/* Last sync */}
  {lastSyncAt && (
    <span className="ml-auto">{lastSyncAt.toLocaleTimeString('id-ID')}</span>
  )}
</div>
```

**useSync integration:**

```typescript
const { pendingCount, lastSyncAt, countPending } = useSync();

useEffect(() => {
  countPending();
  const onFocus = () => countPending();
  window.addEventListener('focus', onFocus);
  return () => window.removeEventListener('focus', onFocus);
}, [countPending]);
```

---

## Data Models

Tidak ada model data baru. Semua state yang relevan sudah ada:

| Source | Type | Konsumen |
|--------|------|----------|
| `localStorage['passura-theme']` | `'light' \| 'dark' \| 'system'` | ThemeProvider |
| `useSync().pendingCount` | `number` | SystemHealthFooter |
| `useSync().lastSyncAt` | `Date \| null` | SystemHealthFooter |
| `useAuth().elder` | `Elder \| null` | UserCardDropdown |
| `navigator.onLine` | `boolean` | SystemHealthFooter |
| `fetch HEAD /api/health` | HTTP status | SystemHealthFooter |

---

## Error Handling

| Skenario | Penanganan |
|----------|-----------|
| `localStorage` tidak tersedia (SSR/private mode) | `getInitialTheme` membungkus read dalam try/catch, fallback ke `'system'` |
| `setTheme` dipanggil dengan nilai tidak valid | Guard check — silently ignored, no state change |
| `fetch HEAD /api/health` timeout atau network error | `serverReachable` diset `false`, dot merah |
| `elder` null (belum login) | Fallback ke inisial `"U"`, nama `"Pengguna"`, email `"-"` |
| MediaQueryList tidak tersedia | `window.matchMedia` terbungkus try/catch, default ke remove `dark` |

---

## File Change Summary

| File | Status | Keterangan |
|------|--------|-----------|
| `src/contexts/ThemeContext.tsx` | **NEW** | ThemeProvider + useTheme hook |
| `src/components/layout/Sidebar.tsx` | **MODIFIED** | UserCardDropdown, navGroups rename, import SystemHealthFooter |
| `src/components/layout/SystemHealthFooter.tsx` | **NEW** | Replaces SyncStatusBar in Sidebar |
| `src/routes/__root.tsx` | **MODIFIED** | Wrap children with ThemeProvider |
| `src/components/layout/SyncStatusBar.tsx` | **UNCHANGED** | Not deleted; simply no longer imported by Sidebar |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Theme state selalu berupa nilai yang valid

*For any* nilai yang tersimpan di localStorage (valid, tidak valid, atau tidak ada), setelah ThemeProvider diinisialisasi, `useTheme().theme` harus bernilai salah satu dari `'light'`, `'dark'`, atau `'system'`.

**Validates: Requirements 1.1, 1.3**

---

### Property 2: setTheme dengan nilai valid memperbarui state dan localStorage

*For any* nilai tema yang valid (`'light'`, `'dark'`, atau `'system'`), memanggil `setTheme(value)` harus menghasilkan `useTheme().theme === value` dan `localStorage.getItem('passura-theme') === value`.

**Validates: Requirements 1.2, 1.4**

---

### Property 3: Kelas `dark` pada `<html>` konsisten dengan tema aktif

*For any* tema yang aktif, kelas `dark` pada `document.documentElement` harus mencerminkan nilai tema tersebut: ada saat tema adalah `'dark'`, tidak ada saat `'light'`, dan mengikuti `prefers-color-scheme` saat `'system'`.

**Validates: Requirements 1.5, 1.6, 1.7**

---

### Property 4: setTheme dengan nilai tidak valid diabaikan

*For any* string yang bukan `'light'`, `'dark'`, atau `'system'`, memanggil `setTheme` dengan string tersebut harus membiarkan `useTheme().theme` dan nilai `localStorage` tidak berubah dari nilai sebelumnya.

**Validates: Requirements 1.9**

---

### Property 5: Avatar inisial UserCardDropdown selalu menampilkan karakter pertama yang benar

*For any* objek `elder` dengan `name` yang tidak kosong, `UserCardDropdown` harus menampilkan karakter pertama dari `elder.name` dalam huruf kapital sebagai inisial avatar; jika `elder` adalah `null`, inisial harus `"U"`.

**Validates: Requirements 2.1**

---

### Property 6: Theme cycle deterministik

*For any* nilai tema aktif dalam `{'light', 'dark', 'system'}`, mengklik item Tema dalam dropdown harus menghasilkan tema berikutnya dalam siklus `light → dark → system → light`.

**Validates: Requirements 2.3**

---

### Property 7: Ikon dan label Tema mencerminkan tema aktif

*For any* tema aktif dalam `{'light', 'dark', 'system'}`, item Tema dalam dropdown harus menampilkan ikon yang sesuai (`Sun`/`Moon`/`Monitor`) beserta label yang benar (`Terang`/`Gelap`/`Sistem`).

**Validates: Requirements 2.6, 2.7, 2.8**

---

### Property 8: Gaya aktif navigasi konsisten untuk semua item nav

*For any* path dalam `navGroups`, ketika rute saat ini cocok dengan path tersebut, item navigasi yang bersangkutan harus memiliki kelas aktif (`bg-primary/10 text-primary font-medium`), dan item-item lainnya tidak boleh memiliki kelas aktif tersebut.

**Validates: Requirements 3.6**

---

### Property 9: Indikator server dot mencerminkan status keterjangkauan

*For any* hasil health check (reachable atau tidak reachable), indikator dot pada `SystemHealthFooter` harus berwarna `bg-green-500` saat server terjangkau dan `bg-red-500` saat tidak terjangkau.

**Validates: Requirements 4.2**

---

### Property 10: Indikator online mencerminkan navigator.onLine secara reaktif

*For any* nilai `navigator.onLine` (dan perubahan runtime via event `online`/`offline`), `SystemHealthFooter` harus menampilkan indikator konektivitas yang sesuai.

**Validates: Requirements 4.4**

---

### Property 11: Teks pending count tampil jika dan hanya jika pendingCount > 0

*For any* nilai `pendingCount` dari `useSync`, teks `"{n} pending"` harus tampil ketika `pendingCount > 0` dan tidak tampil ketika `pendingCount === 0`.

**Validates: Requirements 4.5, 4.6**

---

### Property 12: Waktu sinkronisasi terakhir ditampilkan sesuai format

*For any* nilai `Date` yang bukan `null` sebagai `lastSyncAt`, `SystemHealthFooter` harus menampilkan teks yang identik dengan `lastSyncAt.toLocaleTimeString('id-ID')`.

**Validates: Requirements 4.7**
