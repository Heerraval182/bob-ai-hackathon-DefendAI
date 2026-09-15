"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import {
  LayoutDashboard,
  Wrench,
  Bell,
  ClipboardList,
  MessageSquare,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

const nav = [
  { href: "/",            label: "Fleet Dashboard", Icon: LayoutDashboard, badge: null  },
  { href: "/equipment",   label: "Equipment",       Icon: Wrench,          badge: null  },
  { href: "/alerts",      label: "Alerts",          Icon: Bell,            badge: "5"   },
  { href: "/maintenance", label: "Maintenance",      Icon: ClipboardList,  badge: null  },
  { href: "/copilot",     label: "AI Copilot",       Icon: MessageSquare,  badge: "AI"  },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-[#0d1117] text-slate-100 shrink-0 border-r border-white/[0.06]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-xl blur-sm opacity-40" />
            <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight tracking-tight">DefendAI</p>
            <p className="text-blue-400 text-[9px] tracking-[0.18em] uppercase font-medium">Mission Readiness</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="px-3 mb-3 text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em]">Navigation</p>
        {nav.map(({ href, label, Icon, badge }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                active
                  ? "bg-blue-600/20 text-white"
                  : "text-slate-400 hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-full" />
              )}
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                active ? "bg-blue-600 shadow-lg shadow-blue-500/30" : "bg-white/[0.05] group-hover:bg-white/[0.08]"
              }`}>
                <Icon className={`w-3.5 h-3.5 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
              </div>
              <span className="flex-1">{label}</span>
              {badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                  badge === "AI"
                    ? "bg-violet-500/20 text-violet-300 border border-violet-500/20"
                    : "bg-red-500/20 text-red-300 border border-red-500/20"
                }`}>
                  {badge}
                </span>
              )}
              {active && <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t border-white/[0.06]" />

      {/* User profile + logout */}
      <div className="px-3 py-4 space-y-1.5">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-1">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">
                {user.avatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#0d1117]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">{user.name}</p>
              <p className="text-slate-500 text-[10px] truncate mt-0.5">{user.role}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-500/10 hover:text-red-400 transition-all group"
        >
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] group-hover:bg-red-500/10 flex items-center justify-center shrink-0 transition-colors">
            <LogOut className="w-3.5 h-3.5 group-hover:text-red-400 transition-colors" />
          </div>
          Sign Out
        </button>

        <p className="px-3 text-[9px] text-slate-700 mt-1">© 2024 DefendAI · v1.0.0</p>
      </div>
    </aside>
  );
}
