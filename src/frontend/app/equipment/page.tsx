import Link from "next/link";
import { mockEquipment, mockHealthMap } from "@/lib/mockData";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";

export default function EquipmentListPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <PageHeader title="Equipment" subtitle="All tracked assets — click to view sensor trends and health details" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockEquipment.map((eq) => {
          const h = mockHealthMap[eq.equipment_id];
          return (
            <Link key={eq.equipment_id} href={`/equipment/${eq.equipment_id}`} className="block hover:shadow-md transition-shadow">
              <Card className="h-full">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-slate-400">{eq.equipment_id}</p>
                    <p className="text-base font-bold text-slate-800">{eq.model}</p>
                    <p className="text-xs text-slate-500">{eq.equipment_type} · {eq.unit}</p>
                  </div>
                  <RiskBadge risk={h?.risk_level ?? "LOW"} />
                </div>
                <div className="mb-3">
                  <p className="text-xs text-slate-500 mb-1">Readiness Score</p>
                  <ReadinessBar score={h?.readiness_score ?? 0} />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="bg-slate-50 rounded p-2"><p className="text-slate-400">Failure Prob.</p><p className="font-bold text-slate-700">{h ? `${(h.failure_probability*100).toFixed(0)}%` : "—"}</p></div>
                  <div className="bg-slate-50 rounded p-2"><p className="text-slate-400">Remaining Life</p><p className="font-bold text-slate-700">{h?.remaining_useful_life_days != null ? `${h.remaining_useful_life_days}d` : "—"}</p></div>
                  <div className="bg-slate-50 rounded p-2"><p className="text-slate-400">Usage Hours</p><p className="font-bold text-slate-700">{eq.total_usage_hours}h</p></div>
                  <div className="bg-slate-50 rounded p-2"><p className="text-slate-400">Last Service</p><p className="font-bold text-slate-700">{eq.last_service_date}</p></div>
                </div>
                <StatusBadge status={eq.mission_status} />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
