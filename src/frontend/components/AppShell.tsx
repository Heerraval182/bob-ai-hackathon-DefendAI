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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" />
          </div>
          <p className="text-slate-400 text-sm">Loading DefendAI…</p>
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
