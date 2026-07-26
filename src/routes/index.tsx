import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-orange-500 text-white grid place-items-center font-bold text-sm">
              P
            </div>
            <span className="text-xl font-semibold tracking-tight">
              Passura
            </span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
          >
            Masuk
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Buku Besar Adat{" "}
              <span className="text-orange-600">Digital</span>
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Sistem pencatatan buku besar adat Toraja secara digital. Catat
              pinjaman, penerimaan, penyerahan, dan kewajiban adat dengan aman
              dan transparan — bahkan tanpa koneksi internet.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-orange-600 px-6 py-3 text-sm font-medium text-white hover:bg-orange-700 transition-colors"
              >
                Mulai Sekarang
              </Link>
              <a
                href="https://github.com/Stradivary/passura-digital"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-muted transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>

          {/* Features */}
          <div className="grid gap-6 md:grid-cols-3 mt-16 max-w-4xl mx-auto">
            <FeatureCard
              title="Offline-First"
              description="Data disimpan di perangkat Anda. Aplikasi bekerja penuh tanpa internet setelah instalasi."
            />
            <FeatureCard
              title="PWA Install"
              description="Instal sebagai aplikasi di HP atau laptop. Akses cepat seperti aplikasi native."
            />
            <FeatureCard
              title="Sinkronisasi Opsional"
              description="Sinkronkan data antar perangkat saat online. Atau gunakan murni offline."
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Passura &copy; {new Date().getFullYear()} — Open Source Ledger System
          for Toraja
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border p-6 space-y-2">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
