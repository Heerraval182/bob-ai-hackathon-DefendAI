import { notFound } from "next/navigation";
import Link from "next/link";
import { mockEquipment, mockHealthMap, mockMaintenanceTasks } from "@/lib/mockData";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";
import SensorChart from "@/components/SensorChart";

interface Props { params: { id: string } }

export function generateStaticParams() {
  return Object.keys(mockHealthMap).map((id) => ({ id }));
}

export default function EquipmentDetailPage({ params }: Props) {
  const eq     = mockEquipment.find((e) => e.equipment_id === params.id);
  const health = mockHealthMap[params.id];
  if (!eq || !health) notFound();

  const tasks   = mockMaintenanceTasks.filter((t) => t.equipment_id === params.id);
  const sensors = [
    { type:"temperature", label:"Temperature", unit:"°C",  color:"#ef4444" },
    { type:"vibration",   label:"Vibration",   unit:" g",  color:"#f97316" },
    { type:"pressure",    label:"Pressure",    unit:" PSI",color:"#3b82f6" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <nav className="text-xs text-slate-400 mb-4">
        <Link href="/equipment" className="hover:text-blue-600">Equipment</Link> / <span className="text-slate-600 font-medium">{eq.equipment_id}</span>
      </nav>
      <PageHeader title={eq.model} subtitle={`${eq.equipment_type} · ${eq.unit} · ${eq.total_usage_hours} usage hours`} />

      <div className="flex flex-wrap gap-3 mb-6">
        <StatusBadge status={eq.mission_status} />
        <RiskBadge risk={health.risk_level} />
        <span className="text-xs text-slate-500 self-center">Last service: {eq.last_service_date}</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Readiness Score",     value:`${health.readiness_score}%` },
          { label:"Failure Probability", value:`${(health.failure_probability*100).toFixed(0)}%` },
          { label:"Remaining Life",      value:health.remaining_useful_life_days!=null?`${health.remaining_useful_life_days} days`:"N/A" },
          { label:"Predicted Failure",   value:health.predicted_failure_date??"None detected" },
        ].map((k) => (
          <Card key={k.label} className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-bold text-slate-800">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Readiness Score</p>
        <ReadinessBar score={health.readiness_score} />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sensors.map((s) => (
          <Card key={s.type}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{s.label} (24h)</h3>
            <SensorChart readings={health.sensor_readings} sensorType={s.type} unit={s.unit} color={s.color} />
          </Card>
        ))}
      </div>

      <Card className="mb-6 border-l-4 border-blue-400 bg-blue-50">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-lg mt-0.5">🤖</span>
          <div>
            <p className="text-sm font-semibold text-blue-800 mb-1">AI Explanation</p>
            <p className="text-sm text-blue-700 leading-relaxed">{health.prediction.explanation}</p>
            <p className="text-xs text-blue-500 mt-2">Confidence: {(health.prediction.confidence_score*100).toFixed(0)}% · Component: {health.prediction.component_id}</p>
          </div>
        </div>
      </Card>

      {tasks.length > 0 && (
        <Card>
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Maintenance Tasks</h3>
          <div className="space-y-3">
            {tasks.map((t) => (
              <div key={t.task_id} className="flex gap-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <div className="flex-1">
                  <p className="font-semibold text-slate-700">{t.task_type}</p>
                  <p className="text-slate-500 text-xs mt-0.5">{t.recommended_action}</p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                    t.priority==="CRITICAL"?"bg-red-100 text-red-700":t.priority==="HIGH"?"bg-orange-100 text-orange-700":t.priority==="MEDIUM"?"bg-yellow-100 text-yellow-700":"bg-slate-100 text-slate-600"}`}>
                    {t.priority}
                  </span>
                  <p className="text-xs text-slate-400">~{t.estimated_downtime}h downtime</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
