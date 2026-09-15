"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { SensorReading } from "@/lib/api";

interface Props { readings: SensorReading[]; sensorType: string; unit: string; color: string; }

export default function SensorChart({ readings, sensorType, unit, color }: Props) {
  const data = readings.map((r) => {
    const raw =
      sensorType === "temperature" ? r.temperature :
      sensorType === "vibration"   ? r.vibration   :
      sensorType === "pressure"    ? r.pressure     : r.battery;
    return {
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      value: raw,
    };
  });

  if (!data.length) return <div className="flex items-center justify-center h-32 text-sm text-slate-400">No data</div>;

  return (
    <ResponsiveContainer width="100%" height={180}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} unit={unit} />
        <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6 }}
          formatter={(val: number) => [`${val}${unit}`, sensorType]} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="value" name={sensorType} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
