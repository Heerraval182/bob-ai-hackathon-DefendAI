import Link from "next/link";
import { mockEquipment, mockHealthMap } from "@/lib/mockData";
import { PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";
import { ArrowRight, Activity } from "lucide-react";

export default function EquipmentListPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Equipment"
        subtitle="All tracked assets — click to view sensor trends and health details"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-slate-500 font-medium">{mockEquipment.length} assets tracked</span>
          </div>
        }
      />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockEquipment.map((eq) => {
          const h = mockHealthMap[eq.equipment_id];
          const statusColor =
            eq.mission_status === "MISSION READY"        ? "bg-emerald-500" :
            eq.mission_status === "READY WITH WARNING"   ? "bg-amber-400"   :
            eq.mission_status === "MAINTENANCE REQUIRED" ? "bg-orange-400"  :
                                                          "bg-red-500";
          return (
            <Link
              key={eq.equipment_id}
              href={`/equipment/${eq.equipment_id}`}
              className="block group"
            >
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden group-hover:border-blue-200">
                {/* Status color strip */}
                <div className={`h-1 w-full ${statusColor}`} />

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 mb-0.5">{eq.equipment_id}</p>
                      <p className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">{eq.model}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{eq.equipment_type} &middot; {eq.unit}</p>
                    </div>
                    <RiskBadge risk={h?.risk_level ?? "LOW"} />
                  </div>

                  {/* Readiness bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs text-slate-400 font-medium">Readiness Score</p>
                    </div>
                    <ReadinessBar score={h?.readiness_score ?? 0} />
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Failure Prob.</p>
                      <p className={`text-sm font-black tabular-nums ${
                        h && h.failure_probability > 0.5 ? "text-red-600" :
                        h && h.failure_probability > 0.25 ? "text-amber-500" :
                        "text-emerald-600"
                      }`}>{h ? `${(h.failure_probability*100).toFixed(0)}%` : "—"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Remaining Life</p>
                      <p className="text-sm font-black text-slate-700 tabular-nums">{h?.remaining_useful_life_days != null ? `${h.remaining_useful_life_days}d` : "—"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Usage Hours</p>
                      <p className="text-sm font-black text-slate-700 tabular-nums">{eq.total_usage_hours}h</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Last Service</p>
                      <p className="text-sm font-black text-slate-700">{eq.last_service_date}</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <StatusBadge status={eq.mission_status} />
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      View details <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
