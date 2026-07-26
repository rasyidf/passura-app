import { Link } from "@tanstack/react-router";
import { House } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-2">
        <p className="text-7xl font-bold text-orange-600">404</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Halaman tidak ditemukan
        </h1>
        <p className="text-sm text-muted-foreground">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
      </div>
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"
      >
        <House className="size-4" />
        Kembali ke Beranda
      </Link>
    </div>
  );
}
