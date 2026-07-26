import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpRight,
  HandHelping,
  ListTree,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Hero />
        <About />
        <FeatureList />
        <Services />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────────

function Header() {
  const navLinks = [
    { href: "#about", label: "Tentang" },
    { href: "#fitur", label: "Fitur" },
    { href: "#keunggulan", label: "Keunggulan" },
  ];

  return (
    <header className="border-b px-4 md:px-6 sticky top-0 z-50 bg-background/90 backdrop-blur-sm">
      <div className="container flex h-20 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <a href="/" className="text-xl font-bold text-foreground hover:opacity-90">
            Passura
          </a>
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Masuk
        </Link>
      </div>
    </header>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container">
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              Digitalisasi Manajemen Upacara
              <ArrowUpRight className="ml-2 size-3.5" />
            </span>
            <h1 className="my-6 text-pretty text-4xl font-bold lg:text-6xl">
              Siap Membantu Anda Merencanakan{" "}
              <span className="text-primary">Rambu Solo&apos;</span>
            </h1>
            <p className="text-muted-foreground mb-8 max-w-xl lg:text-xl">
              Passura hadir untuk mempermudah pengelolaan Rambu Solo&apos; dengan
              layanan yang terarah dan terpercaya.
            </p>
            <div className="flex w-full flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Hubungi Admin
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Gunakan Passura
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>
          <img
            src="/images/hero-rambu-solo.png"
            alt="Upacara Rambu Solo' Toraja"
            className="max-h-96 w-full rounded-md object-contain"
          />
        </div>
      </div>
    </section>
  );
}

// ─── About ───────────────────────────────────────────────────────────────────

function About() {
  return (
    <section id="about" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-7xl">
          <p className="mb-4 text-xs text-muted-foreground md:pl-5">Tentang</p>
          <h2 className="mt-0 text-4xl font-semibold text-balance lg:text-5xl">
            Lebih mengenal Passura
          </h2>
        </div>
        <div className="grid items-center gap-8 md:gap-16 lg:grid-cols-2 mt-10">
          <img
            src="/images/about.png"
            alt="Tentang Passura - Platform Digital Rambu Solo'"
            className="max-h-96 w-full rounded-md object-contain"
          />
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="mb-8 max-w-xl text-justify text-muted-foreground lg:text-lg">
              Passura adalah platform digital yang membantu masyarakat Toraja
              dalam proses pengelolaan dan pencatatan donasi serta kebutuhan
              upacara adat Rambu Solo&apos;. Dengan sistem yang lebih modern,
              Passura hadir untuk menggantikan cara tradisional yang selama ini
              dilakukan secara manual agar proses persiapan upacara berjalan
              lebih mudah, rapi, dan efisien.
            </p>
            <div className="flex w-full flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Mulai
              </Link>
              <a
                href="#fitur"
                className="inline-flex items-center justify-center rounded-md border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
              >
                Pelajari Lebih Lanjut
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Feature List ────────────────────────────────────────────────────────────

const features = [
  {
    id: "feature-1",
    title: "Kelola Tongkonan/Grup dengan Mudah",
    description:
      "Buat, kelola, dan atur anggota tongkonan/grup keluarga secara terstruktur agar koordinasi dalam Rambu Solo' lebih rapi dan terpantau.",
    image: "/images/features/feature-1.png",
  },
  {
    id: "feature-2",
    title: "Undang & Gabung Grup Lebih Praktis",
    description:
      "Undang anggota baru hanya dengan sekali klik, atau gabung ke grup tongkonan dengan kode undangan tanpa ribet.",
    image: "/images/features/feature-2.png",
  },
  {
    id: "feature-3",
    title: "Pencatatan Sumbangan yang Transparan",
    description:
      "Catat setiap bentuk sumbangan dengan detail dan jelas, sehingga semua kontribusi tercatat rapi dan dapat dipantau oleh anggota.",
    image: "/images/features/feature-3.png",
  },
  {
    id: "feature-4",
    title: "Pendataan Utang Piutang yang Akurat",
    description:
      "Pantau utang-piutang antar anggota dengan sistem yang tertib, menghindari salah catat dan mempermudah pelunasan setelah acara.",
    image: "/images/features/feature-4.png",
  },
];

function FeatureList() {
  return (
    <section id="fitur" className="py-20 lg:py-32">
      <div className="container flex flex-col gap-16 lg:px-16">
        <div className="lg:max-w-sm">
          <h2 className="mb-3 text-xl font-semibold md:mb-4 md:text-4xl lg:mb-6">
            Fitur-Fitur Passura
          </h2>
          <p className="text-muted-foreground mb-8 lg:text-lg">
            Sistem buku besar digital untuk pencatatan sumbangan, utang-piutang,
            dan pengelolaan upacara Rambu Solo&apos; yang transparan dan
            terstruktur.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:gap-8">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="border-border flex flex-col overflow-clip rounded-xl border"
            >
              <div>
                <img
                  src={feature.image}
                  alt={feature.title}
                  className="aspect-video h-full w-full object-cover object-center bg-muted"
                />
              </div>
              <div className="px-6 py-8 md:px-8 md:py-10 lg:px-10 lg:py-12">
                <h3 className="mb-3 text-lg font-semibold md:mb-4 md:text-2xl lg:mb-6">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground lg:text-lg">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Services / Keunggulan ───────────────────────────────────────────────────

function Services() {
  const services = [
    {
      icon: <HandHelping className="h-6 w-6" />,
      title: "Kemudahan",
      description:
        "Input dan akses data donasi, penerimaan, maupun utang piutang dapat dilakukan dengan cepat melalui dashboard yang sederhana.",
    },
    {
      icon: <Search className="h-6 w-6" />,
      title: "Transparansi",
      description:
        "Setiap transaksi tercatat jelas dan dapat dilihat oleh semua pihak yang berwenang, termasuk tetua adat.",
    },
    {
      icon: <ListTree className="h-6 w-6" />,
      title: "Terstruktur",
      description:
        "Data tersusun rapi berdasarkan grup, pengguna, dan kategori transaksi.",
    },
  ];

  return (
    <section id="keunggulan" className="py-20 lg:py-32">
      <div className="container">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="space-y-4 text-center">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Keunggulan
            </h2>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg tracking-tight md:text-xl">
              Mengapa Anda harus menggunakan Passura dalam Rambu Solo&apos;
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {services.map((service, index) => (
              <div
                key={index}
                className="border-border space-y-6 rounded-lg border p-8 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-muted rounded-full p-3">{service.icon}</div>
                  <h3 className="text-xl font-semibold">{service.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ─────────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="bg-muted overflow-hidden flex w-full flex-col rounded-lg md:rounded-xl lg:flex-row lg:items-stretch">
          {/* Text & buttons */}
          <div className="flex flex-1 flex-col justify-center gap-6 p-8 lg:p-12">
            <div>
              <h3 className="mb-4 text-3xl font-bold md:text-4xl">
                Siap Membantu Anda{" "}
                <span className="text-primary">Merencanakan Rambu Solo&apos;</span>
              </h3>
              <p className="text-muted-foreground max-w-xl lg:text-lg">
                Passura hadir untuk mempermudah pengelolaan Rambu Solo&apos;
                dengan layanan yang terarah dan terpercaya.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
              >
                Tentang Passura
              </a>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Gunakan Passura
              </Link>
            </div>
          </div>
          {/* Image */}
          <div className="relative hidden lg:flex lg:w-[480px] xl:w-[560px] items-end justify-end">
            <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-transparent z-10 w-24" />
            <img
              src="/images/hero-rambu-solo.png"
              alt="Passura dashboard preview"
              className="h-full w-full object-cover object-left-top"
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  const navItems = [
    { label: "Beranda", href: "/" },
    { label: "Tentang", href: "#about" },
    { label: "Fitur", href: "#fitur" },
    { label: "Keunggulan", href: "#keunggulan" },
  ];

  return (
    <footer className="bg-zinc-950 text-white border-t border-white/10">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.7fr,1fr]">
          <div>
            <p className="text-2xl font-semibold">Passura</p>
            <p className="mt-6 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
              Catat sumbangan Rambu Solo&apos; dengan praktis, rapi, dan tanpa
              ribet. Semua data terintegrasi dalam satu sistem.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Navigasi
            </p>
            <ul className="mt-6 space-y-3 text-sm text-zinc-300">
              {navItems.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="transition-colors hover:text-white"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-zinc-500">
            &copy; {new Date().getFullYear()} Passura. Hak Cipta dilindungi.
          </p>
        </div>
      </div>
    </footer>
  );
}
