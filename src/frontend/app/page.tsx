import Link from "next/link";
import { mockEquipment, mockAlerts, mockReport, mockHealthMap } from "@/lib/mockData";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar, StatCard } from "@/components/ui";
import { CheckCircle2, AlertTriangle, Wrench, XCircle, ArrowRight } from "lucide-react";

export default function DashboardPage() {
  const alerts = mockAlerts.filter((a) => !a.acknowledged).slice(0, 5);
  const readyPct = Math.round((mockReport.mission_ready / mockReport.total_equipment) * 100);

  const stats = [
    {
      label: "Mission Ready",
      value: mockReport.mission_ready,
      sub: `${readyPct}% of fleet`,
      color: "text-emerald-600",
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
    {
      label: "Ready w/ Warning",
      value: mockReport.ready_with_warning,
      sub: "Monitor closely",
      color: "text-amber-500",
      icon: <AlertTriangle className="w-4 h-4" />,
    },
    {
      label: "Maintenance Required",
      value: mockReport.maintenance_required,
      sub: "Before deployment",
      color: "text-orange-500",
      icon: <Wrench className="w-4 h-4" />,
    },
    {
      label: "Not Mission Ready",
      value: mockReport.not_mission_ready,
      sub: `${mockReport.critical_alerts} critical alerts`,
      color: "text-red-600",
      icon: <XCircle className="w-4 h-4" />,
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Fleet Readiness Dashboard"
        subtitle={`Report: ${new Date(mockReport.generated_at).toLocaleString()} · ${mockReport.total_equipment} total assets`}
      />

      {/* KPI stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub={s.sub}
            color={s.color}
            icon={s.icon}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment status table */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Equipment Status</h3>
              <Link href="/equipment" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-50">
              {mockEquipment.map((eq) => {
                const h = mockHealthMap[eq.equipment_id];
                return (
                  <Link
                    key={eq.equipment_id}
                    href={`/equipment/${eq.equipment_id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 transition-colors group"
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-[10px] font-mono text-slate-400 mb-0.5">{eq.equipment_id}</p>
                      <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{eq.model}</p>
                      <p className="text-[11px] text-slate-400">{eq.equipment_type}</p>
                    </div>
                    <div className="flex-1">
                      <ReadinessBar score={h?.readiness_score ?? 0} />
                    </div>
                    <div className="w-16 text-right shrink-0">
                      <RiskBadge risk={h?.risk_level ?? "LOW"} />
                    </div>
                    <div className="w-44 shrink-0 text-right">
                      <StatusBadge status={eq.mission_status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active alerts */}
          <Card>
            <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-700">Active Alerts</h3>
              <Link href="/alerts" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.alert_id}
                  className={`p-3 rounded-xl border-l-4 text-sm ${
                    a.severity === "CRITICAL"
                      ? "bg-red-50 border-red-500"
                      : a.severity === "WARNING"
                      ? "bg-amber-50 border-amber-400"
                      : "bg-sky-50 border-sky-400"
                  }`}
                >
                  <p className="font-semibold text-slate-700 leading-snug text-xs">{a.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {a.equipment_id} · {a.component} · {new Date(a.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Copilot CTA */}
          <Card>
            <div className="p-5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-800 mb-1">Ask Copilot</h3>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Get instant AI-powered answers about fleet readiness and maintenance priorities.
              </p>
              <Link
                href="/copilot"
                className="inline-flex items-center gap-2 w-full justify-center bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-blue-600/20"
              >
                Open Copilot Chat
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Fleet readiness breakdown bar */}
      <Card className="mt-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">Fleet Readiness Breakdown</h3>
            <span className="text-xs text-slate-400">{mockReport.total_equipment} assets total</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {[
              { count: mockReport.mission_ready,        color: "bg-emerald-500", label: "Mission Ready" },
              { count: mockReport.ready_with_warning,   color: "bg-amber-400",   label: "Warning" },
              { count: mockReport.maintenance_required, color: "bg-orange-400",  label: "Maintenance" },
              { count: mockReport.not_mission_ready,    color: "bg-red-500",     label: "Not Ready" },
            ].map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.count}`}
                className={`${s.color} first:rounded-l-full last:rounded-r-full`}
                style={{ flex: s.count }}
              />
            ))}
          </div>
          <div className="flex gap-6 mt-3 flex-wrap">
            {[
              { label: "Mission Ready",        color: "bg-emerald-500", count: mockReport.mission_ready },
              { label: "Ready w/ Warning",     color: "bg-amber-400",   count: mockReport.ready_with_warning },
              { label: "Maintenance Required", color: "bg-orange-400",  count: mockReport.maintenance_required },
              { label: "Not Mission Ready",    color: "bg-red-500",     count: mockReport.not_mission_ready },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-slate-600">{l.label}</span>
                <span className="text-xs font-semibold text-slate-800">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
