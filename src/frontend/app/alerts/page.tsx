"use client";
import { useState } from "react";
import Link from "next/link";
import { mockAlerts } from "@/lib/mockData";
import { Card, PageHeader, SeverityBadge } from "@/components/ui";
import type { Alert } from "@/lib/api";

type Filter = "ALL"|"CRITICAL"|"WARNING"|"INFO";

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return `${Math.round(d)}s ago`;
  if (d < 3600) return `${Math.round(d/60)}m ago`;
  if (d < 86400) return `${Math.round(d/3600)}h ago`;
  return `${Math.round(d/86400)}d ago`;
}

export default function AlertsPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  const visible = alerts.filter((a) => filter==="ALL" || a.severity===filter);
  const counts = { ALL:alerts.length, CRITICAL:alerts.filter(a=>a.severity==="CRITICAL").length, WARNING:alerts.filter(a=>a.severity==="WARNING").length, INFO:alerts.filter(a=>a.severity==="INFO").length };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <PageHeader title="Alerts" subtitle="Active equipment alerts sorted by severity and time" />
      <div className="flex gap-2 mb-5 flex-wrap">
        {(["ALL","CRITICAL","WARNING","INFO"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${filter===f?"bg-slate-800 text-white border-slate-800":"bg-white text-slate-600 border-slate-200 hover:border-slate-400"}`}>
            {f} <span className="ml-1 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {visible.length===0 && <Card><p className="text-sm text-slate-400 text-center py-6">No alerts match this filter.</p></Card>}
        {visible.map((a) => (
          <div key={a.alert_id} className={`bg-white rounded-xl border shadow-sm p-4 flex gap-4 items-start ${a.acknowledged?"opacity-50":""}`}>
            <div className={`w-1 rounded-full self-stretch ${a.severity==="CRITICAL"?"bg-red-500":a.severity==="WARNING"?"bg-yellow-400":"bg-blue-400"}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-slate-800 leading-snug">{a.message}</p>
                <SeverityBadge severity={a.severity} />
              </div>
              <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                <span><Link href={`/equipment/${a.equipment_id}`} className="font-medium text-blue-600 hover:underline">{a.equipment_id}</Link> · {a.equipment_type}</span>
                <span>Component: {a.component}</span>
                <span>{timeAgo(a.timestamp)}</span>
                {a.acknowledged && <span className="text-emerald-600 font-medium">✓ Acknowledged</span>}
              </div>
            </div>
            {!a.acknowledged && (
              <button onClick={() => setAlerts(prev => prev.map(x => x.alert_id===a.alert_id?{...x,acknowledged:true}:x))}
                className="shrink-0 text-xs text-slate-500 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                Acknowledge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
