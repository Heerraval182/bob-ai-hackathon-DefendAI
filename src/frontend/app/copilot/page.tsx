"use client";
import { useState, useRef, useEffect } from "react";
import { copilotSamples } from "@/lib/mockData";
import { Card, PageHeader } from "@/components/ui";

interface Msg { role:"user"|"assistant"; text:string; ts:Date; }

const SUGGESTIONS = [
  "Which vehicles are not ready for tomorrow's mission?",
  "Why is Aircraft EQ-002 marked as high risk?",
  "Which component should be serviced first?",
  "Show equipment with abnormal vibration.",
];

function pick(q: string): string {
  const lq = q.toLowerCase();
  if (lq.includes("not ready")||lq.includes("grounded"))   return copilotSamples["not ready"];
  if (lq.includes("ready")||lq.includes("mission"))        return copilotSamples["ready"];
  if (lq.includes("high risk")||lq.includes("eq-002"))     return copilotSamples["high risk"];
  if (lq.includes("vibration")||lq.includes("abnormal"))   return copilotSamples["vibration"];
  if (lq.includes("service")||lq.includes("first")||lq.includes("component")) return copilotSamples["service"];
  return copilotSamples["default"];
}

export default function CopilotPage() {
  const [msgs, setMsgs]     = useState<Msg[]>([{ role:"assistant", text:"Hello! I'm the Mission Readiness Copilot. Ask me about fleet readiness, equipment health, failure risks, or maintenance priorities.", ts:new Date() }]);
  const [input, setInput]   = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  async function send(q: string) {
    if (!q.trim() || loading) return;
    setMsgs(m=>[...m,{ role:"user", text:q, ts:new Date() }]);
    setInput(""); setLoading(true);
    await new Promise(r=>setTimeout(r,800));
    setMsgs(m=>[...m,{ role:"assistant", text:pick(q), ts:new Date() }]);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-3xl mx-auto flex flex-col" style={{ height:"calc(100vh - 0px)" }}>
      <PageHeader title="Copilot Assistant" subtitle="Ask natural-language questions about equipment readiness and maintenance" />
      <Card className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {msgs.map((m,i) => (
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${m.role==="user"?"bg-blue-600 text-white rounded-br-sm":"bg-white border border-slate-200 text-slate-700 rounded-bl-sm"}`}>
                {m.role==="assistant" && <p className="text-xs font-semibold text-blue-500 mb-1">🤖 Copilot</p>}
                {m.text}
                <p className={`text-xs mt-1.5 ${m.role==="user"?"text-blue-200":"text-slate-400"}`}>{m.ts.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-blue-500 mb-1">🤖 Copilot</p>
                <div className="flex gap-1 items-center h-4">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
        <div className="px-5 pb-3 flex gap-2 flex-wrap border-t border-slate-100 pt-3">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={()=>send(s)} className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors">{s}</button>
          ))}
        </div>
        <div className="flex gap-2 px-4 pb-4">
          <input className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            placeholder="Ask about readiness, failures, or maintenance…" value={input}
            onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send(input)} disabled={loading} />
          <button onClick={()=>send(input)} disabled={loading||!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors">Send</button>
        </div>
      </Card>
    </div>
  );
}
