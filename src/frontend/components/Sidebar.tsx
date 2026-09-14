"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/",            label: "Fleet Dashboard", icon: "⊞" },
  { href: "/equipment",   label: "Equipment",       icon: "🔧" },
  { href: "/alerts",      label: "Alerts",          icon: "🔔" },
  { href: "/maintenance", label: "Maintenance",     icon: "📋" },
  { href: "/copilot",     label: "Copilot",         icon: "💬" },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 shrink-0">
      <div className="px-5 py-5 border-b border-slate-700">
        <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase mb-1">DefendAI</p>
        <h1 className="text-base font-bold text-white">Mission Readiness Copilot</h1>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-3">
        {nav.map((item) => {
          const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}>
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        <p>© 2024 DefendAI · v0.1</p>
      </div>
    </aside>
  );
}
