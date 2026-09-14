type Status = "MISSION READY"|"READY WITH WARNING"|"MAINTENANCE REQUIRED"|"NOT MISSION READY";
type Risk   = "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
type Sev    = "INFO"|"WARNING"|"CRITICAL";
type Prio   = "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";

const SC: Record<Status,string> = {
  "MISSION READY":        "bg-emerald-100 text-emerald-800 border border-emerald-200",
  "READY WITH WARNING":   "bg-yellow-100 text-yellow-800 border border-yellow-200",
  "MAINTENANCE REQUIRED": "bg-orange-100 text-orange-800 border border-orange-200",
  "NOT MISSION READY":    "bg-red-100 text-red-800 border border-red-200",
};
const RC: Record<Risk,string> = {
  LOW:"bg-emerald-100 text-emerald-800", MEDIUM:"bg-yellow-100 text-yellow-800",
  HIGH:"bg-orange-100 text-orange-800",  CRITICAL:"bg-red-100 text-red-800",
};
const SeC: Record<Sev,string> = {
  INFO:"bg-blue-100 text-blue-800", WARNING:"bg-yellow-100 text-yellow-800", CRITICAL:"bg-red-100 text-red-800",
};
const PC: Record<Prio,string> = {
  CRITICAL:"bg-red-100 text-red-800 border border-red-200",
  HIGH:"bg-orange-100 text-orange-800 border border-orange-200",
  MEDIUM:"bg-yellow-100 text-yellow-800 border border-yellow-200",
  LOW:"bg-slate-100 text-slate-700 border border-slate-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SC[status]}`}>{status}</span>;
}
export function RiskBadge({ risk }: { risk: Risk }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${RC[risk]}`}>{risk}</span>;
}
export function SeverityBadge({ severity }: { severity: Sev }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${SeC[severity]}`}>{severity}</span>;
}
export function PriorityBadge({ priority }: { priority: Prio }) {
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${PC[priority]}`}>{priority}</span>;
}
export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${className ?? ""}`}>{children}</div>;
}
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}
export function ReadinessBar({ score }: { score: number }) {
  const color = score >= 85 ? "bg-emerald-500" : score >= 65 ? "bg-yellow-400" : score >= 40 ? "bg-orange-400" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-8 text-right">{score}%</span>
    </div>
  );
}
