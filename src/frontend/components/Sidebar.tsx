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
  { href: "/",            label: "Fleet Dashboard", Icon: LayoutDashboard },
  { href: "/equipment",   label: "Equipment",       Icon: Wrench          },
  { href: "/alerts",      label: "Alerts",          Icon: Bell            },
  { href: "/maintenance", label: "Maintenance",      Icon: ClipboardList  },
  { href: "/copilot",     label: "Copilot",          Icon: MessageSquare  },
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
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-100 shrink-0 border-r border-slate-800">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4.5 h-4.5 text-white w-5 h-5" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">DefendAI</p>
            <p className="text-blue-400 text-[10px] tracking-widest uppercase">Mission Readiness</p>
          </div>
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-0.5 px-3">
        <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Navigation</p>
        {nav.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}>
              <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-white"}`} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3.5 h-3.5 text-blue-300" />}
            </Link>
          );
        })}
      </nav>

      {/* User profile + logout */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-800">
        {user && (
          <div className="mb-2">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-800/70">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold truncate">{user.name}</p>
                <p className="text-slate-400 text-[10px] truncate">{user.role}</p>
              </div>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-900/40 hover:text-red-400 transition-all group"
        >
          <LogOut className="w-4 h-4 shrink-0 group-hover:text-red-400" />
          Sign Out
        </button>
        <p className="px-3 mt-2 text-[10px] text-slate-600">© 2024 DefendAI · v0.1</p>
      </div>
    </aside>
  );
}
