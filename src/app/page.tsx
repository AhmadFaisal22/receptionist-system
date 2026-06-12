import Link from "next/link";
import Logo from "@/components/Logo";

const LINKS = [
  {
    href: "/checkin",
    title: "Visitor check-in",
    desc: "Buku tamu digital — form for visitors at the gate",
  },
  {
    href: "/checkout",
    title: "Visitor check-out",
    desc: "Exit QR target — one-tap clock out",
  },
  {
    href: "/login",
    title: "Staff login",
    desc: "Receptionist dashboard, guard view, admin",
  },
  {
    href: "/qr",
    title: "QR posters",
    desc: "Print the CHECK IN / CHECK OUT posters for the security post",
  },
] as const;

export default function Home() {
  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Logo className="h-11 w-auto" />
          <div>
            <h1 className="text-lg font-semibold leading-tight">
              SEG Solar Manufaktur Indonesia
            </h1>
            <p className="text-sm text-slate-500">Visitor management system</p>
          </div>
        </div>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="block rounded-2xl bg-white border border-slate-200 p-4 hover:border-slate-400 transition-colors"
          >
            <p className="font-medium">{l.title}</p>
            <p className="text-sm text-slate-500">{l.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
