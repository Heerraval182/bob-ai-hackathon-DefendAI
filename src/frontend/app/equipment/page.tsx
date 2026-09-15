import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";
import { ArrowRight, Activity } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EquipmentListPage() {
  const [equipment, report] = await Promise.all([
    api.getEquipment().catch(() => []),
    api.getReadinessReport().catch(() => null),
  ]);

  const healthMap = Object.fromEntries(
    (report?.equipment ?? []).map(e => [e.equipment_id, e])
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader
        title="Equipment"
        subtitle="All tracked assets — click to view sensor trends and health details"
        action={
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs text-slate-500 font-medium">{equipment.length} assets tracked</span>
          </div>
        }
      />

      {equipment.length === 0 && (
        <div className="text-center py-16 text-slate-400 text-sm">
          No equipment data. Make sure the Node.js backend is running on port 3001.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {equipment.map((eq) => {
          const h = healthMap[eq.equipment_id];
          const statusColor =
            eq.mission_status === "MISSION READY"        ? "bg-emerald-500" :
            eq.mission_status === "READY WITH WARNING"   ? "bg-amber-400"   :
            eq.mission_status === "MAINTENANCE REQUIRED" ? "bg-orange-400"  : "bg-red-500";

          return (
            <Link key={eq.equipment_id} href={`/equipment/${eq.equipment_id}`} className="block group">
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-lg transition-all overflow-hidden group-hover:border-blue-200">
                <div className={`h-1 w-full ${statusColor}`} />
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-[10px] font-mono text-slate-400 mb-0.5">{eq.equipment_id}</p>
                      <p className="text-base font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight">{eq.model}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{eq.equipment_type} &middot; {eq.unit}</p>
                    </div>
                    <RiskBadge risk={h?.ai_risk_level ?? "Unknown"} />
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-slate-400 font-medium mb-1.5">Readiness Score</p>
                    <ReadinessBar score={h?.readiness_score ?? 50} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Failure Prob.</p>
                      <p className={`text-sm font-black tabular-nums ${
                        h && (h.failure_probability ?? 0) > 0.5 ? "text-red-600" :
                        h && (h.failure_probability ?? 0) > 0.25 ? "text-amber-500" : "text-emerald-600"
                      }`}>{h?.failure_probability != null ? `${(h.failure_probability * 100).toFixed(0)}%` : "—"}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Remaining Life</p>
                      <p className="text-sm font-black text-slate-700 tabular-nums">
                        {h?.remaining_useful_life != null ? `${h.remaining_useful_life}d` : "—"}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Usage Hours</p>
                      <p className="text-sm font-black text-slate-700 tabular-nums">{eq.total_usage_hours}h</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Last Service</p>
                      <p className="text-sm font-black text-slate-700">{eq.last_service_date ?? "—"}</p>
                    </div>
                  </div>

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
