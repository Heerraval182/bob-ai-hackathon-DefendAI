"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle, Zap, Activity, Shield } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex bg-[#080c14] overflow-hidden">
      {/* Animated grid background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,1) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      {/* Left panel */}
      <div className="relative hidden lg:flex flex-col justify-between w-[500px] shrink-0 p-12 border-r border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 rounded-xl blur-md opacity-50" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight tracking-tight">DefendAI</p>
            <p className="text-blue-400 text-[10px] tracking-[0.2em] uppercase font-medium">Mission Readiness</p>
          </div>
        </div>

        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-blue-300 font-medium tracking-wide">System Operational</span>
          </div>
          <h2 className="text-5xl font-black text-white leading-none mb-5 tracking-tight">
            Predictive<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Intelligence
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-10">
            Real-time fleet health monitoring, AI-powered failure prediction, and automated
            maintenance scheduling — all in one command platform.
          </p>

          <div className="space-y-4">
            {[
              { Icon: Activity, label: "Fleet Readiness Dashboard", desc: "Live overview of all assets & sensor data" },
              { Icon: Zap,      label: "Predictive Failure Alerts",  desc: "AI-driven anomaly detection & early warnings" },
              { Icon: Shield,   label: "Mission Copilot",             desc: "Natural language fleet queries powered by LLaMA" },
            ].map(({ Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <div className="w-9 h-9 rounded-lg bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight">{label}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-slate-600 text-xs">© 2024 DefendAI · Classification: UNCLASSIFIED</p>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">v1.0.0</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="relative flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold leading-tight">DefendAI</p>
              <p className="text-blue-400 text-[10px] tracking-wider uppercase">Mission Readiness</p>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl shadow-black/40">
            <div className="mb-7">
              <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Welcome back</h1>
              <p className="text-slate-400 text-sm">Sign in to your command account</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  {error}
                </div>
              )}

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@defendai.mil"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Password</label>
                  <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                    Forgot password?
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all overflow-hidden group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{ background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" }}
              >
                <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="w-4 h-4" />
                    Sign In Securely
                  </span>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            <div className="mt-5 p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/15">
              <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mb-2">Demo Credentials</p>
              <div className="space-y-1.5">
                {[
                  { role: "Fleet Commander", email: "hayes@defendai.mil" },
                  { role: "Maintenance Tech", email: "rivera@defendai.mil" },
                ].map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword("demo1234"); }}
                    className="w-full text-left flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors group"
                  >
                    <span className="text-xs text-slate-400 group-hover:text-slate-300 font-mono transition-colors">{d.email}</span>
                    <span className="text-[10px] text-blue-400 font-medium">{d.role}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5 text-center">Password: <span className="font-mono text-slate-500">demo1234</span></p>
            </div>

            <p className="text-center text-slate-500 text-sm mt-5">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
