"use client";
import { useState } from "react";
import Link from "next/link";
import { mockAlerts } from "@/lib/mockData";
import { Card, PageHeader, SeverityBadge } from "@/components/ui";
import type { Alert } from "@/lib/api";
import { CheckCheck, Bell } from "lucide-react";

type Filter = "ALL"|"CRITICAL"|"WARNING"|"INFO";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d/60)}m ago`;
  if (d < 86400) return `${Math.round(d/3600)}h ago`;
  return `${Math.round(d/86400)}d ago`;
}

const SEV_RING: Record<string, string> = {
  CRITICAL: "border-red-400/40 bg-red-50/50",
  WARNING:  "border-amber-400/40 bg-amber-50/50",
  INFO:     "border-sky-400/40 bg-sky-50/50",
};
const SEV_STRIP: Record<string, string> = {
  CRITICAL: "bg-red-500",
  WARNING:  "bg-amber-400",
  INFO:     "bg-sky-400",
};

export default function AlertsPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const visible = alerts.filter((a) => filter==="ALL" || a.severity===filter);
  const counts = {
    ALL: alerts.length,
    CRITICAL: alerts.filter(a=>a.severity==="CRITICAL").length,
    WARNING:  alerts.filter(a=>a.severity==="WARNING").length,
    INFO:     alerts.filter(a=>a.severity==="INFO").length,
  };
  const unacked = alerts.filter(a=>!a.acknowledged).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader
        title="Alerts"
        subtitle="Active equipment alerts sorted by severity and time"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Bell className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs text-slate-500 font-medium">{unacked} unacknowledged</span>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {([
          { key: "ALL",      label: "Total Alerts",     count: counts.ALL,      color: "text-slate-700",  bg: "bg-slate-100",   border: "border-slate-200" },
          { key: "CRITICAL", label: "Critical",         count: counts.CRITICAL, color: "text-red-700",    bg: "bg-red-50",      border: "border-red-200" },
          { key: "WARNING",  label: "Warning",          count: counts.WARNING,  color: "text-amber-700",  bg: "bg-amber-50",    border: "border-amber-200" },
          { key: "INFO",     label: "Informational",    count: counts.INFO,     color: "text-sky-700",    bg: "bg-sky-50",      border: "border-sky-200" },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => setFilter(s.key as Filter)}
            className={`text-left p-4 rounded-2xl border shadow-sm transition-all hover:shadow-md ${
              filter === s.key ? `${s.bg} ${s.border} ring-2 ring-offset-1 ring-blue-400` : "bg-white border-slate-200"
            }`}
          >
            <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-1">{s.label}</p>
            <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.count}</p>
          </button>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["ALL","CRITICAL","WARNING","INFO"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter===f
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700"
            }`}
          >
            {f}
            <span className="ml-1.5 opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {visible.length===0 && (
          <Card>
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-400">No alerts match this filter.</p>
            </div>
          </Card>
        )}
        {visible.map((a) => (
          <div
            key={a.alert_id}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden flex transition-all hover:shadow-md ${
              a.acknowledged ? "opacity-50" : SEV_RING[a.severity]
            }`}
          >
            {/* Severity strip */}
            <div className={`w-1 shrink-0 ${SEV_STRIP[a.severity]}`} />
            <div className="flex-1 flex gap-4 items-start p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{a.message}</p>
                  <SeverityBadge severity={a.severity} />
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                  <Link href={`/equipment/${a.equipment_id}`} className="font-semibold text-blue-600 hover:text-blue-700 hover:underline transition-colors">{a.equipment_id}</Link>
                  <span>&middot; {a.equipment_type}</span>
                  <span>&middot; Component: <span className="text-slate-600 font-medium">{a.component}</span></span>
                  <span>&middot; {timeAgo(a.timestamp)}</span>
                  {a.acknowledged && <span className="text-emerald-600 font-semibold">Acknowledged</span>}
                </div>
              </div>
              {!a.acknowledged && (
                <button
                  onClick={() => setAlerts(prev => prev.map(x => x.alert_id===a.alert_id ? {...x, acknowledged:true} : x))}
                  className="shrink-0 inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 border border-slate-200 hover:border-emerald-200 rounded-xl px-3 py-2 transition-all font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
