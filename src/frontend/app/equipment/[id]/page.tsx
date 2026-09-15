import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Card, PageHeader, StatusBadge, RiskBadge, ReadinessBar } from "@/components/ui";
import SensorChart from "@/components/SensorChart";

interface Props { params: { id: string } }

export const dynamic = "force-dynamic";

export default async function EquipmentDetailPage({ params }: Props) {
  const id = params.id;

  const [eq, health] = await Promise.all([
    api.getEquipmentById(id).catch(() => null),
    api.getEquipmentHealth(id).catch(() => null),
  ]);

  if (!eq) notFound();

  const tasks = await api.getMaintenanceTasks().then(t => t.filter(x => x.equipment_id === id)).catch(() => []);

  const reading   = health?.latest_reading;
  const pred      = health?.prediction ?? null;
  const score     = health?.sensor_health?.readiness_score ?? 50;
  const status    = health?.sensor_health?.readiness_status ?? eq.mission_status;
  const issues    = health?.sensor_health?.issues ?? [];

  // Build fake sensor readings array from single latest reading for the chart
  const chartReadings = reading ? [reading] : [];

  const sensors = [
    { type:"temperature", label:"Temperature", unit:"°C",  color:"#ef4444" },
    { type:"vibration",   label:"Vibration",   unit:" g",  color:"#f97316" },
    { type:"pressure",    label:"Pressure",    unit:" bar",color:"#3b82f6" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <nav className="text-xs text-slate-400 mb-4">
        <Link href="/equipment" className="hover:text-blue-600">Equipment</Link>
        {" / "}
        <span className="text-slate-600 font-medium">{eq.equipment_id}</span>
      </nav>

      <PageHeader
        title={eq.model}
        subtitle={`${eq.equipment_type} · ${eq.unit} · ${eq.total_usage_hours} usage hours`}
      />

      <div className="flex flex-wrap gap-3 mb-6">
        <StatusBadge status={status} />
        <RiskBadge risk={pred?.risk_level ?? "Unknown"} />
        <span className="text-xs text-slate-500 self-center">Last service: {eq.last_service_date ?? "—"}</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Readiness Score",     value:`${score}%` },
          { label:"Failure Probability", value: pred ? `${(pred.failure_probability * 100).toFixed(0)}%` : "—" },
          { label:"Remaining Life",      value: pred?.remaining_useful_life != null ? `${pred.remaining_useful_life} days` : "N/A" },
          { label:"Predicted Failure",   value: pred?.predicted_failure_date ?? "None detected" },
        ].map((k) => (
          <Card key={k.label} className="text-center">
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{k.label}</p>
            <p className="text-xl font-bold text-slate-800">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Readiness bar */}
      <Card className="mb-6">
        <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Readiness Score</p>
        <ReadinessBar score={score} />
        {issues.length > 0 && (
          <ul className="mt-3 space-y-1">
            {issues.map((iss, i) => (
              <li key={i} className="text-xs text-red-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                {iss}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Sensor charts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {sensors.map((s) => (
          <Card key={s.type}>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">{s.label}</h3>
            {reading ? (
              <div className="text-2xl font-black text-slate-800 tabular-nums">
                {s.type === "temperature" ? `${reading.temperature}°C`
                  : s.type === "vibration" ? `${reading.vibration} g`
                  : `${reading.pressure} bar`}
              </div>
            ) : (
              <SensorChart readings={chartReadings} sensorType={s.type} unit={s.unit} color={s.color} />
            )}
            <p className="text-xs text-slate-400 mt-1">Latest reading</p>
          </Card>
        ))}
      </div>

      {/* AI Explanation */}
      {pred && (
        <Card className="mb-6 border-l-4 border-blue-400 bg-blue-50">
          <div className="flex items-start gap-3">
            <span className="text-blue-500 text-lg mt-0.5">🤖</span>
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">AI Explanation</p>
              <p className="text-sm text-blue-700 leading-relaxed">{pred.explanation}</p>
              <p className="text-xs text-blue-500 mt-2">
                Confidence: {pred.confidence_score != null ? `${(pred.confidence_score * 100).toFixed(0)}%` : "—"}
                {" · "}Component: {pred.component_id}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Maintenance tasks */}
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
                    t.priority==="Critical" ? "bg-red-100 text-red-700"
                    : t.priority==="High"   ? "bg-orange-100 text-orange-700"
                    : t.priority==="Medium" ? "bg-yellow-100 text-yellow-700"
                    : "bg-slate-100 text-slate-600"}`}>
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
