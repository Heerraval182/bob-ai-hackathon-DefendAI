"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff, AlertCircle, Briefcase, CheckCircle2 } from "lucide-react";

const ROLES = ["Fleet Commander", "Maintenance Tech", "Intelligence Analyst", "Operator", "Observer"];

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [role, setRole] = useState("Operator");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : 3;
  const strengthLabel = ["", "Weak", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-yellow-400", "bg-emerald-500"][strength];
  const strengthWidth = ["w-0", "w-1/3", "w-2/3", "w-full"][strength];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirmPw) { setError("Passwords do not match."); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    const result = await signup(name, email, password, role);
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
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl" />
      </div>

      {/* Left branding panel */}
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
          <h2 className="text-5xl font-black text-white leading-none mb-5 tracking-tight">
            Join the<br />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Command Platform
            </span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Create your secure account to access real-time fleet analytics, predictive maintenance, and AI-powered mission planning.
          </p>

          <div className="space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-widest mb-4">Access levels by role</p>
            {[
              { role: "Fleet Commander",     access: "Full read/write — all assets & reports",  color: "text-blue-400",    dot: "bg-blue-500"    },
              { role: "Maintenance Tech",    access: "Equipment records + maintenance tasks",     color: "text-cyan-400",    dot: "bg-cyan-500"    },
              { role: "Intelligence Analyst",access: "Analytics dashboards + copilot access",    color: "text-violet-400",  dot: "bg-violet-500"  },
              { role: "Operator",            access: "Dashboard view + alert acknowledgement",   color: "text-emerald-400", dot: "bg-emerald-500" },
            ].map((r) => (
              <div key={r.role} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-semibold ${r.color}`}>{r.role}</span>
                  <span className="text-slate-500 text-xs"> — {r.access}</span>
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

      {/* Right form panel */}
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
              <h1 className="text-2xl font-bold text-white mb-1.5 tracking-tight">Create account</h1>
              <p className="text-slate-400 text-sm">Set up your secure command access</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Commander J. Smith"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>

                <div className="col-span-2">
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

                <div className="col-span-2">
                  <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Role</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors z-10" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.06] border border-white/10 text-white text-sm focus:outline-none focus:border-blue-500/60 focus:bg-white/[0.08] focus:ring-1 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
                    >
                      {ROLES.map((r) => <option key={r} value={r} className="bg-slate-900 text-white">{r}</option>)}
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
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
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${strengthColor} ${strengthWidth}`} />
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Password strength: <span className={`font-medium ${strength === 3 ? "text-emerald-400" : strength === 2 ? "text-yellow-400" : "text-red-400"}`}>{strengthLabel}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full pl-10 pr-10 py-3 rounded-xl bg-white/[0.06] border text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-1 transition-all ${
                      confirmPw && confirmPw !== password
                        ? "border-red-500/40 focus:border-red-500/60 focus:ring-red-500/20"
                        : confirmPw && confirmPw === password
                        ? "border-emerald-500/40 focus:border-emerald-500/60 focus:ring-emerald-500/20"
                        : "border-white/10 focus:border-blue-500/60 focus:ring-blue-500/20"
                    }`}
                  />
                  {confirmPw && confirmPw === password && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400" />
                  )}
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
                    Creating account…
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Create Secure Account
                  </span>
                )}
              </button>
            </form>

            <p className="text-center text-slate-500 text-sm mt-5">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
