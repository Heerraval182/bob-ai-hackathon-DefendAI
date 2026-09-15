import React from "react";

type Status = "MISSION READY"|"READY WITH WARNING"|"MAINTENANCE REQUIRED"|"NOT MISSION READY";
type Risk   = "LOW"|"MEDIUM"|"HIGH"|"CRITICAL";
type Sev    = "INFO"|"WARNING"|"CRITICAL";
type Prio   = "CRITICAL"|"HIGH"|"MEDIUM"|"LOW";

const SC: Record<Status, string> = {
  "MISSION READY":        "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100",
  "READY WITH WARNING":   "bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100",
  "MAINTENANCE REQUIRED": "bg-orange-50 text-orange-700 border border-orange-200 ring-1 ring-orange-100",
  "NOT MISSION READY":    "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-100",
};
const RC: Record<Risk, string> = {
  LOW:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  MEDIUM:   "bg-amber-50 text-amber-700 border border-amber-200",
  HIGH:     "bg-orange-50 text-orange-700 border border-orange-200",
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
};
const SeC: Record<Sev, string> = {
  INFO:     "bg-sky-50 text-sky-700 border border-sky-200",
  WARNING:  "bg-amber-50 text-amber-700 border border-amber-200",
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
};
const PC: Record<Prio, string> = {
  CRITICAL: "bg-red-50 text-red-700 border border-red-200",
  HIGH:     "bg-orange-50 text-orange-700 border border-orange-200",
  MEDIUM:   "bg-amber-50 text-amber-700 border border-amber-200",
  LOW:      "bg-slate-50 text-slate-600 border border-slate-200",
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${SC[status]}`}>
      {status}
    </span>
  );
}

export function RiskBadge({ risk }: { risk: Risk }) {
  const dot: Record<Risk, string> = {
    LOW: "bg-emerald-500", MEDIUM: "bg-amber-500", HIGH: "bg-orange-500", CRITICAL: "bg-red-500",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${RC[risk]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[risk]}`} />
      {risk}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: Sev }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${SeC[severity]}`}>
      {severity}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Prio }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${PC[priority]}`}>
      {priority}
    </span>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-slate-200/80 shadow-sm ${className ?? ""}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className ?? ""}`}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function ReadinessBar({ score }: { score: number }) {
  const color =
    score >= 85 ? "bg-emerald-500" :
    score >= 65 ? "bg-amber-400"   :
    score >= 40 ? "bg-orange-400"  :
                  "bg-red-500";
  const glow =
    score >= 85 ? "shadow-emerald-200" :
    score >= 65 ? "shadow-amber-200"   :
    score >= 40 ? "shadow-orange-200"  :
                  "shadow-red-200";

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 shadow-sm ${color} ${glow}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${
        score >= 85 ? "text-emerald-600" : score >= 65 ? "text-amber-500" : score >= 40 ? "text-orange-500" : "text-red-500"
      }`}>{score}%</span>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
          {icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
              {icon}
            </div>
          )}
        </div>
        <p className={`text-3xl font-bold tracking-tight ${color ?? "text-slate-800"}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </Card>
  );
}
