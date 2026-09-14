import Link from "next/link";
import { mockEquipment, mockAlerts, mockReport, mockHealthMap } from "@/lib/mockData";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";

export default function DashboardPage() {
  const alerts = mockAlerts.filter((a) => !a.acknowledged).slice(0, 5);
  const readyPct = Math.round((mockReport.mission_ready / mockReport.total_equipment) * 100);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Fleet Readiness Dashboard"
        subtitle={`Report: ${new Date(mockReport.generated_at).toLocaleString()} · ${mockReport.total_equipment} assets`} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Mission Ready",        value:mockReport.mission_ready,        sub:`${readyPct}% of fleet`,    color:"text-emerald-600" },
          { label:"Ready w/ Warning",     value:mockReport.ready_with_warning,   sub:"Monitor closely",          color:"text-yellow-600"  },
          { label:"Maintenance Required", value:mockReport.maintenance_required, sub:"Before deployment",        color:"text-orange-500"  },
          { label:"Not Mission Ready",    value:mockReport.not_mission_ready,    sub:`${mockReport.critical_alerts} critical alerts`, color:"text-red-600" },
        ].map((k) => (
          <Card key={k.label} className="flex flex-col gap-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{k.label}</p>
            <p className={`text-3xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs text-slate-500">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Equipment Status</h3>
            <div className="space-y-3">
              {mockEquipment.map((eq) => {
                const h = mockHealthMap[eq.equipment_id];
                return (
                  <Link key={eq.equipment_id} href={`/equipment/${eq.equipment_id}`}
                    className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors group">
                    <div className="w-28 shrink-0">
                      <p className="text-xs font-mono text-slate-400">{eq.equipment_id}</p>
                      <p className="text-sm font-semibold text-slate-700 truncate group-hover:text-blue-600">{eq.model}</p>
                      <p className="text-xs text-slate-400">{eq.equipment_type}</p>
                    </div>
                    <div className="flex-1"><ReadinessBar score={h?.readiness_score ?? 0} /></div>
                    <div className="w-16 text-right shrink-0"><RiskBadge risk={h?.risk_level ?? "LOW"} /></div>
                    <div className="w-44 shrink-0 text-right"><StatusBadge status={eq.mission_status} /></div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        <div>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-700">Active Alerts</h3>
              <Link href="/alerts" className="text-xs text-blue-600 hover:underline font-medium">View all →</Link>
            </div>
            <div className="space-y-3">
              {alerts.map((a) => (
                <div key={a.alert_id} className={`p-3 rounded-lg border-l-4 text-sm ${
                  a.severity==="CRITICAL"?"bg-red-50 border-red-500":a.severity==="WARNING"?"bg-yellow-50 border-yellow-400":"bg-blue-50 border-blue-400"}`}>
                  <p className="font-semibold text-slate-700 leading-snug">{a.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{a.equipment_id} · {a.component} · {new Date(a.timestamp).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          </Card>
          <Card className="mt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Ask Copilot</h3>
            <p className="text-xs text-slate-500 mb-3">Get instant answers about fleet readiness and maintenance.</p>
            <Link href="/copilot" className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors">
              Open Copilot Chat →
            </Link>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-4">Fleet Readiness Breakdown</h3>
        <div className="flex h-8 rounded-full overflow-hidden gap-0.5">
          {[
            { count:mockReport.mission_ready,        color:"bg-emerald-500", label:"Mission Ready" },
            { count:mockReport.ready_with_warning,   color:"bg-yellow-400",  label:"Warning" },
            { count:mockReport.maintenance_required, color:"bg-orange-400",  label:"Maintenance" },
            { count:mockReport.not_mission_ready,    color:"bg-red-500",     label:"Not Ready" },
          ].map((s) => <div key={s.label} title={`${s.label}: ${s.count}`} className={`${s.color}`} style={{ flex:s.count }} />)}
        </div>
        <div className="flex gap-6 mt-3 flex-wrap">
          {[
            { label:"Mission Ready",        color:"bg-emerald-500" },
            { label:"Ready w/ Warning",     color:"bg-yellow-400"  },
            { label:"Maintenance Required", color:"bg-orange-400"  },
            { label:"Not Mission Ready",    color:"bg-red-500"     },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
              <span className="text-xs text-slate-600">{l.label}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
