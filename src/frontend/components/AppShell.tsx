"use client";
import { useAuth } from "@/lib/auth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { ShieldCheck } from "lucide-react";

const PUBLIC_ROUTES = ["/login", "/signup"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.replace("/login");
    }
    if (!loading && user && isPublic) {
      router.replace("/");
    }
  }, [loading, user, isPublic, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.025]" aria-hidden="true"
          style={{
            backgroundImage: "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="relative flex flex-col items-center gap-5">
          {/* Logo with pulse ring */}
          <div className="relative">
            <span className="absolute inset-0 rounded-2xl bg-blue-500/20 animate-ping" style={{ animationDuration: "2s" }} />
            <span className="absolute inset-0 rounded-2xl bg-blue-500/10 scale-125 animate-ping" style={{ animationDuration: "2.5s" }} />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-2xl shadow-blue-500/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-white font-bold text-lg tracking-tight">DefendAI</p>
            <p className="text-slate-500 text-xs">Authenticating session…</p>
          </div>
          <div className="flex gap-1.5">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      </div>
    );
  }

  // Public pages (login / signup) render without sidebar
  if (isPublic) {
    return <>{children}</>;
  }

  // Not authenticated: don't flash content while redirect happens
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
