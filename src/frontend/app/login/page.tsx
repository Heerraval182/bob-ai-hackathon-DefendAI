"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, AlertCircle } from "lucide-react";

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

  function fillDemo() {
    setEmail("hayes@defendai.mil");
    setPassword("demo1234");
    setError("");
  }

  return (
    <div className="min-h-screen flex bg-slate-950">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 border-r border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">DefendAI</p>
            <p className="text-blue-400 text-xs tracking-wider">MISSION READINESS</p>
          </div>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Predictive Intelligence<br />
            <span className="text-blue-400">for Every Mission</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Real-time fleet health monitoring, AI-powered failure prediction, and automated maintenance scheduling — all in one command platform.
          </p>
          <div className="space-y-3">
            {[
              { label: "Fleet Readiness Dashboard", desc: "Live overview of all assets" },
              { label: "Predictive Failure Alerts", desc: "AI-driven anomaly detection" },
              { label: "Mission Copilot", desc: "Natural language fleet queries" },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{f.label}</p>
                  <p className="text-slate-500 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-slate-600 text-xs">© 2024 DefendAI · Classification: UNCLASSIFIED</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold leading-tight">DefendAI</p>
              <p className="text-blue-400 text-xs tracking-wider">MISSION READINESS</p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
            <p className="text-slate-400 text-sm">Sign in to your command account</p>
          </div>

          {/* Demo hint */}
          <button
            onClick={fillDemo}
            className="w-full mb-6 px-4 py-2.5 rounded-xl border border-blue-800 bg-blue-950/60 text-blue-300 text-sm hover:bg-blue-900/60 transition-colors text-left flex items-center gap-2"
          >
            <span className="text-base">⚡</span>
            <span><strong>Quick demo:</strong> Click to fill credentials — <code className="text-blue-200 text-xs">hayes@defendai.mil</code></span>
          </button>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-950/60 border border-red-800 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@defendai.mil"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 text-sm font-medium">Password</label>
                <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPw ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
