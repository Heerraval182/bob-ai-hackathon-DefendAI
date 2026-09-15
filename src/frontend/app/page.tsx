import Link from "next/link";
import { mockEquipment, mockAlerts, mockReport, mockHealthMap } from "@/lib/mockData";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar, StatCard } from "@/components/ui";
import { CheckCircle2, AlertTriangle, Wrench, XCircle, ArrowRight, TrendingUp, Cpu, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const alerts = mockAlerts.filter((a) => !a.acknowledged).slice(0, 5);
  const readyPct = Math.round((mockReport.mission_ready / mockReport.total_equipment) * 100);

  const stats = [
    {
      label: "Mission Ready",
      value: mockReport.mission_ready,
      sub: `${readyPct}% of total fleet`,
      color: "text-emerald-600",
      icon: <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />,
      iconBg: "bg-emerald-50 border border-emerald-100",
    },
    {
      label: "Ready w/ Warning",
      value: mockReport.ready_with_warning,
      sub: "Monitor closely",
      color: "text-amber-500",
      icon: <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />,
      iconBg: "bg-amber-50 border border-amber-100",
    },
    {
      label: "Maintenance Required",
      value: mockReport.maintenance_required,
      sub: "Before next deployment",
      color: "text-orange-500",
      icon: <Wrench className="w-4.5 h-4.5 text-orange-500" />,
      iconBg: "bg-orange-50 border border-orange-100",
    },
    {
      label: "Not Mission Ready",
      value: mockReport.not_mission_ready,
      sub: `${mockReport.critical_alerts} critical alerts active`,
      color: "text-red-600",
      icon: <XCircle className="w-4.5 h-4.5 text-red-600" />,
      iconBg: "bg-red-50 border border-red-100",
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Hero header */}
      <div className="mb-7 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Live</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fleet Readiness Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Report generated {new Date(mockReport.generated_at).toLocaleString()} &middot; {mockReport.total_equipment} total assets tracked
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-slate-200 shadow-sm">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">{readyPct}%</span>
          <span className="text-xs text-slate-400">Fleet Ready</span>
        </div>
      </div>

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
            iconBg={s.iconBg}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equipment status table */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Equipment Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">{mockEquipment.length} assets tracked</p>
              </div>
              <Link href="/equipment" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
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
                    className="flex items-center gap-4 px-5 py-4 hover:bg-blue-50/40 transition-colors group"
                  >
                    <div className="w-28 shrink-0">
                      <p className="text-[10px] font-mono text-slate-400 mb-0.5">{eq.equipment_id}</p>
                      <p className="text-sm font-bold text-slate-800 truncate group-hover:text-blue-600 transition-colors">{eq.model}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{eq.equipment_type}</p>
                    </div>
                    <div className="flex-1">
                      <ReadinessBar score={h?.readiness_score ?? 0} />
                    </div>
                    <div className="w-20 text-right shrink-0">
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
            <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Active Alerts</h3>
                <p className="text-xs text-slate-400 mt-0.5">{alerts.length} unacknowledged</p>
              </div>
              <Link href="/alerts" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                View all <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="p-3 space-y-2">
              {alerts.map((a) => (
                <div
                  key={a.alert_id}
                  className={`p-3 rounded-xl border-l-[3px] ${
                    a.severity === "CRITICAL"
                      ? "bg-red-50/80 border-red-500"
                      : a.severity === "WARNING"
                      ? "bg-amber-50/80 border-amber-400"
                      : "bg-sky-50/80 border-sky-400"
                  }`}
                >
                  <p className="font-semibold text-slate-700 leading-snug text-xs">{a.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="font-mono">{a.equipment_id}</span>
                    <span>&middot;</span>
                    <span>{a.component}</span>
                    <span>&middot;</span>
                    <span>{new Date(a.timestamp).toLocaleTimeString()}</span>
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Copilot CTA */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-5 shadow-lg shadow-blue-600/20">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: "radial-gradient(circle at 30% 50%, rgba(255,255,255,0.4) 0%, transparent 60%)",
              }}
            />
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center mb-3">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-bold text-sm mb-1">AI Mission Copilot</h3>
              <p className="text-blue-100 text-xs mb-4 leading-relaxed">
                Ask questions about fleet readiness, maintenance priorities, and mission planning.
              </p>
              <Link
                href="/copilot"
                className="inline-flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold py-2 px-4 rounded-xl transition-colors shadow-sm"
              >
                <Cpu className="w-3.5 h-3.5" />
                Open Copilot Chat
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Fleet readiness breakdown bar */}
      <Card className="mt-6">
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Fleet Readiness Breakdown</h3>
            <span className="text-xs text-slate-400">{mockReport.total_equipment} assets total</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {[
              { count: mockReport.mission_ready,        color: "bg-emerald-500", label: "Mission Ready" },
              { count: mockReport.ready_with_warning,   color: "bg-amber-400",   label: "Warning" },
              { count: mockReport.maintenance_required, color: "bg-orange-400",  label: "Maintenance" },
              { count: mockReport.not_mission_ready,    color: "bg-red-500",     label: "Not Ready" },
            ].map((s) => (
              <div
                key={s.label}
                title={`${s.label}: ${s.count}`}
                className={`${s.color} first:rounded-l-full last:rounded-r-full transition-all`}
                style={{ flex: s.count }}
              />
            ))}
          </div>
          <div className="flex gap-6 mt-4 flex-wrap">
            {[
              { label: "Mission Ready",        color: "bg-emerald-500", count: mockReport.mission_ready },
              { label: "Ready w/ Warning",     color: "bg-amber-400",   count: mockReport.ready_with_warning },
              { label: "Maintenance Required", color: "bg-orange-400",  count: mockReport.maintenance_required },
              { label: "Not Mission Ready",    color: "bg-red-500",     count: mockReport.not_mission_ready },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-slate-500">{l.label}</span>
                <span className="text-xs font-bold text-slate-800">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
