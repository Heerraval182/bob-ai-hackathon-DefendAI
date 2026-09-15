"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import {
  Send, Bot, User as UserIcon, Trash2, Download, Zap,
  ShieldCheck, AlertTriangle, Wrench, Activity,
  CheckCircle2, XCircle, ChevronRight, AlertCircle,
  Cpu, Globe, Code2, FlaskConical,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: Date;
  historyEntry?: { role: string; content: string };
  isFallback?: boolean;
  model?: string;
  streaming?: boolean;
}

// ─── Suggestion groups ────────────────────────────────────────────────────────

const SUGGESTION_GROUPS = [
  {
    label: "Readiness",
    icon: ShieldCheck,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200 hover:bg-blue-100",
    questions: [
      "Give me a full fleet overview",
      "Which equipment is mission ready right now?",
      "Show readiness scores ranked from lowest to highest",
      "How is the readiness score calculated?",
    ],
  },
  {
    label: "Risk & Alerts",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-50 border-red-200 hover:bg-red-100",
    questions: [
      "Which vehicles are not ready for tomorrow's mission?",
      "List all active critical alerts",
      "Which asset has the highest failure probability?",
      "Explain why EQ-004 is grounded",
    ],
  },
  {
    label: "Sensors",
    icon: Activity,
    color: "text-purple-600",
    bg: "bg-purple-50 border-purple-200 hover:bg-purple-100",
    questions: [
      "Show all vibration anomalies across the fleet",
      "Which engines are overheating?",
      "Compare hydraulic pressure readings for all aircraft",
      "Explain what the sensor trend data means for EQ-003",
    ],
  },
  {
    label: "Maintenance",
    icon: Wrench,
    color: "text-orange-600",
    bg: "bg-orange-50 border-orange-200 hover:bg-orange-100",
    questions: [
      "Which component should be serviced first?",
      "Give me a full prioritised maintenance plan",
      "What is the remaining useful life of each asset?",
      "What is the total estimated downtime for all open tasks?",
    ],
  },
  {
    label: "AI & Tech",
    icon: Cpu,
    color: "text-teal-600",
    bg: "bg-teal-50 border-teal-200 hover:bg-teal-100",
    questions: [
      "How does the failure prediction model work?",
      "Explain Isolation Forest anomaly detection",
      "What is Remaining Useful Life (RUL) estimation?",
      "How does predictive maintenance differ from preventive?",
    ],
  },
  {
    label: "General",
    icon: Globe,
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200 hover:bg-slate-100",
    questions: [
      "Explain how military HUMS systems work",
      "What is condition-based maintenance?",
      "Write a maintenance briefing summary for today",
      "What are common causes of rotor imbalance in helicopters?",
    ],
  },
];

// ─── Markdown renderer ────────────────────────────────────────────────────────
// Handles: ## headers, **bold**, *italic*, `inline code`, ```code blocks```,
//          - bullet lists, 1. numbered lists, > blockquotes, | tables |, --- dividers

function renderMarkdown(text: string): string {
  if (!text) return "";

  const lines = text.split("\n");
  const out: string[] = [];
  let inCode = false;
  let codeLang = "";
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let tableIsHeader = true;
  let inList = false;
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!inList) return;
    if (listType === "ul") out.push("</ul>");
    else out.push("</ol>");
    inList = false;
    listType = null;
  }

  function flushTable() {
    if (!inTable || tableRows.length === 0) return;
    let html = '<div class="overflow-x-auto my-3"><table class="min-w-full text-xs border-collapse">';
    tableRows.forEach((row, i) => {
      html += "<tr>";
      row.forEach((cell) => {
        const tag = i === 0 ? "th" : "td";
        const cls =
          i === 0
            ? "px-3 py-1.5 bg-slate-50 font-semibold text-slate-600 border border-slate-200 text-left"
            : "px-3 py-1.5 border border-slate-200 text-slate-700";
        html += `<${tag} class="${cls}">${inlineFormat(cell.trim())}</${tag}>`;
      });
      html += "</tr>";
    });
    html += "</table></div>";
    out.push(html);
    inTable = false;
    tableRows = [];
    tableIsHeader = true;
  }

  function inlineFormat(s: string): string {
    return s
      .replace(/`([^`]+)`/g, '<code class="bg-slate-100 text-pink-600 px-1 py-0.5 rounded text-[11px] font-mono">$1</code>')
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/~~(.+?)~~/g, "<del>$1</del>");
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw;

    // Code block fence
    if (line.trimStart().startsWith("```")) {
      if (!inCode) {
        flushList();
        flushTable();
        inCode = true;
        codeLang = line.trim().slice(3).trim();
        codeBuffer = [];
      } else {
        const langLabel = codeLang ? `<span class="text-slate-400 text-[10px] float-right">${codeLang}</span>` : "";
        out.push(
          `<div class="my-3 rounded-xl overflow-hidden border border-slate-200">` +
          `<div class="bg-slate-800 px-3 py-1.5 text-[10px] text-slate-400 font-mono flex items-center justify-between"><span>code</span>${langLabel}</div>` +
          `<pre class="bg-slate-900 text-emerald-300 text-xs p-3 overflow-x-auto font-mono leading-relaxed whitespace-pre"><code>${codeBuffer.map(l => l.replace(/</g,"&lt;").replace(/>/g,"&gt;")).join("\n")}</code></pre>` +
          `</div>`
        );
        inCode = false;
        codeLang = "";
        codeBuffer = [];
      }
      continue;
    }
    if (inCode) { codeBuffer.push(line); continue; }

    // Table rows
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      flushList();
      if (!inTable) inTable = true;
      // skip separator rows (|---|---|)
      if (/^\|[-| :]+\|$/.test(line.trim())) { tableIsHeader = false; continue; }
      const cells = line.trim().slice(1, -1).split("|");
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Horizontal rule
    if (/^---+$/.test(line.trim())) {
      flushList();
      out.push('<hr class="my-3 border-slate-200" />');
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      out.push(`<blockquote class="border-l-4 border-blue-300 bg-blue-50 pl-3 pr-2 py-1.5 my-2 text-slate-600 text-[13px] italic rounded-r-lg">${inlineFormat(line.slice(2))}</blockquote>`);
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h1) { flushList(); out.push(`<h1 class="text-base font-bold text-slate-900 mt-4 mb-1">${inlineFormat(h1[1])}</h1>`); continue; }
    if (h2) { flushList(); out.push(`<h2 class="text-sm font-bold text-slate-800 mt-3 mb-1 border-b border-slate-100 pb-1">${inlineFormat(h2[1])}</h2>`); continue; }
    if (h3) { flushList(); out.push(`<h3 class="text-xs font-bold text-slate-700 mt-2 mb-0.5 uppercase tracking-wide">${inlineFormat(h3[1])}</h3>`); continue; }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*+] (.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) flushList();
        out.push('<ul class="my-1 space-y-0.5 pl-4">');
        inList = true; listType = "ul";
      }
      out.push(`<li class="text-sm text-slate-700 flex gap-2"><span class="text-blue-400 mt-0.5 shrink-0">•</span><span>${inlineFormat(ulMatch[2])}</span></li>`);
      continue;
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\. (.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) flushList();
        out.push('<ol class="my-1 space-y-0.5 pl-4 list-decimal list-inside">');
        inList = true; listType = "ol";
      }
      out.push(`<li class="text-sm text-slate-700">${inlineFormat(olMatch[2])}</li>`);
      continue;
    }

    flushList();

    // Empty line
    if (line.trim() === "") {
      out.push('<div class="h-2"></div>');
      continue;
    }

    // Normal paragraph
    out.push(`<p class="text-sm text-slate-700 leading-relaxed">${inlineFormat(line)}</p>`);
  }

  flushList();
  flushTable();

  return out.join("\n");
}

// ─── AssistantBubble ──────────────────────────────────────────────────────────

function AssistantBubble({ msg, onSend }: { msg: Message; onSend: (q: string) => void }) {
  const rendered = renderMarkdown(msg.text);
  return (
    <div className="flex justify-start">
      <div className="flex gap-2.5 max-w-[92%] lg:max-w-[85%]">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm ${msg.streaming ? "bg-blue-500 animate-pulse" : "bg-blue-600"}`}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border ${msg.isFallback ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Copilot</span>
                {msg.streaming && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-blue-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce [animation-delay:-0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" />
                    generating…
                  </span>
                )}
                {msg.isFallback && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">
                    <AlertCircle className="w-2.5 h-2.5" />No API key
                  </span>
                )}
              </div>
              {msg.model && !msg.streaming && (
                <span className="text-[10px] text-slate-400 font-mono">{msg.model}</span>
              )}
            </div>

            {/* Rendered markdown content */}
            <div
              className="prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: rendered || '<p class="text-sm text-slate-400 italic">Thinking…</p>' }}
            />

            {/* Streaming cursor */}
            {msg.streaming && (
              <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
          <p className="text-[10px] text-slate-400 mt-1 ml-1">
            {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ msg }: { msg: Message }) {
  return (
    <div className="flex justify-end">
      <div className="flex gap-2.5 max-w-[80%]">
        <div className="flex-1 min-w-0">
          <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 mr-1 text-right">
            {msg.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-1">
          <UserIcon className="w-3.5 h-3.5 text-slate-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Welcome message ──────────────────────────────────────────────────────────

const WELCOME_TEXT = `## Hello! I'm DefendAI Copilot 👋

I'm powered by **LLaMA 3.3 70B** and can answer **any question** you ask — not just fleet topics.

### What I know about your fleet right now:
- **6 assets** tracked with live HUMS sensor data
- **4 active critical alerts** requiring immediate attention
- **2 assets** are fully mission ready, **1 is grounded**
- Full sensor readings, failure predictions, and maintenance tasks

### I can also help with:
- General knowledge, science, history, and technology
- Coding, debugging, and technical explanations
- Writing, analysis, and summaries
- Military aviation and vehicle maintenance concepts
- Anything else you can think of!

**Just type your question below — no restrictions.**`;

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: WELCOME_TEXT,
  ts: new Date(),
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CopilotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Build conversation history from messages (excluding welcome)
  function getHistory(): Array<{ role: string; content: string }> {
    return messages
      .filter((m) => m.historyEntry)
      .map((m) => m.historyEntry!);
  }

  const send = useCallback(
    async (q: string) => {
      const question = q.trim();
      if (!question || loading) return;

      setInput("");
      setLoading(true);

      const userMsg: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        text: question,
        ts: new Date(),
        historyEntry: { role: "user", content: question },
      };

      // Placeholder streaming message
      const assistantId = `a-${Date.now()}`;
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        text: "",
        ts: new Date(),
        streaming: true,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      // Build history BEFORE adding current user message
      const history = getHistory();

      try {
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";
        let finalModel = "";
        let isFallback = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            try {
              const evt = JSON.parse(payload);
              if (evt.text) {
                fullText += evt.text;
                // Update message in-place as tokens stream in
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: fullText, streaming: !evt.done } : m
                  )
                );
              }
              if (evt.done) {
                finalModel = evt.model ?? "";
                isFallback = evt.fallback ?? false;
              }
              if (evt.fallback && !evt.done) {
                isFallback = true;
              }
            } catch {
              // skip malformed lines
            }
          }
        }

        // Finalise the message with history entry + model info
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: fullText || "No response received.",
                  streaming: false,
                  model: finalModel,
                  isFallback,
                  historyEntry: { role: "assistant", content: fullText },
                }
              : m
          )
        );
      } catch (err) {
        console.error("Copilot stream error:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  text: "**Connection error.** Could not reach the Copilot API. Please check your connection and try again.",
                  streaming: false,
                  isFallback: true,
                }
              : m
          )
        );
      } finally {
        setLoading(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    },
    [loading, messages] // eslint-disable-line react-hooks/exhaustive-deps
  );

  function clearChat() {
    setMessages([WELCOME]);
  }

  function exportChat() {
    const text = messages
      .map((m) => `[${m.ts.toLocaleString()}] ${m.role.toUpperCase()}:\n${m.text}\n`)
      .join("\n---\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `copilot-session-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const userCount = messages.filter((m) => m.role === "user").length;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">

      {/* ── Left panel: suggestion groups ──────────────────────────── */}
      <div className="hidden xl:flex flex-col w-72 shrink-0 bg-white border-r border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold text-slate-800">Ask Anything</p>
          </div>
          <p className="text-[11px] text-slate-400 ml-9">Fleet data · General knowledge · Analysis</p>
        </div>
        <div className="flex-1 p-3 space-y-4 pb-6">
          {SUGGESTION_GROUPS.map((grp) => (
            <div key={grp.label}>
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <grp.icon className={`w-3.5 h-3.5 ${grp.color}`} />
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{grp.label}</p>
              </div>
              <div className="space-y-1.5">
                {grp.questions.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    disabled={loading}
                    className={`w-full text-left text-[12px] px-3 py-2 rounded-xl border transition-all ${grp.bg} text-slate-700 leading-snug disabled:opacity-40`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main chat ───────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900">DefendAI Copilot</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
                <p className="text-[11px] text-slate-400">
                  {loading ? "Generating response…" : `Ready · LLaMA 3.3 70B · ${userCount} question${userCount !== 1 ? "s" : ""} asked`}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportChat} title="Export conversation"
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={clearChat} title="Clear conversation"
              className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {messages.map((m) =>
            m.role === "user"
              ? <UserBubble key={m.id} msg={m} />
              : <AssistantBubble key={m.id} msg={m} onSend={send} />
          )}
          <div ref={bottomRef} />
        </div>

        {/* Mobile chips */}
        <div className="xl:hidden px-4 pb-2 flex gap-2 overflow-x-auto">
          {["Fleet overview","Not ready","Active alerts","Vibration anomalies","Service priority","Explain RUL","Write maintenance report"].map((s) => (
            <button key={s} onClick={() => send(s)} disabled={loading}
              className="shrink-0 text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-full text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors whitespace-nowrap disabled:opacity-40">
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-slate-200 px-4 py-3 shrink-0">
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask anything — fleet data, maintenance, general knowledge, coding…"
                disabled={loading}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all disabled:opacity-60"
              />
            </div>
            <button
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all shadow-sm shadow-blue-600/20 shrink-0"
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 px-1 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            Answers any question · Fleet expert + general AI · Responses stream in real time · Enter to send
          </p>
        </div>
      </div>

      {/* ── Right panel: fleet snapshot + session ──────────────────── */}
      <div className="hidden 2xl:flex flex-col w-64 shrink-0 bg-white border-l border-slate-200 overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Fleet Snapshot</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Live as of Nov 20, 2024 08:00</p>
        </div>
        <div className="p-3 space-y-2">
          {[
            { label: "Mission Ready",    value: 2, total: 6, color: "text-emerald-600", bar: "bg-emerald-500", icon: CheckCircle2 },
            { label: "Ready w/ Warning", value: 2, total: 6, color: "text-amber-600",   bar: "bg-amber-400",   icon: AlertTriangle },
            { label: "Maint. Required",  value: 1, total: 6, color: "text-orange-600",  bar: "bg-orange-400",  icon: Wrench },
            { label: "Not Ready",        value: 1, total: 6, color: "text-red-600",     bar: "bg-red-500",     icon: XCircle },
          ].map(({ label, value, total, color, bar, icon: Icon }) => (
            <div key={label} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <p className="text-[11px] font-medium text-slate-600">{label}</p>
                </div>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
              <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${bar}`} style={{ width: `${(value / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="px-3 pt-1 pb-3 border-t border-slate-100 mt-1">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Capabilities</p>
          <div className="space-y-1.5">
            {[
              { icon: Activity,    label: "Fleet sensor data",   color: "text-blue-500"   },
              { icon: Wrench,      label: "Maintenance planning", color: "text-orange-500" },
              { icon: Code2,       label: "Coding & technical",   color: "text-teal-500"   },
              { icon: FlaskConical,label: "Science & analysis",   color: "text-purple-500" },
              { icon: Globe,       label: "General knowledge",    color: "text-slate-500"  },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 px-2 py-1">
                <Icon className={`w-3 h-3 ${color}`} />
                <span className="text-[11px] text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="px-3 py-3 border-t border-slate-100">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Session</p>
          <div className="space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Questions</span>
              <span className="font-semibold text-slate-700">{userCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Signed in</span>
              <span className="font-semibold text-slate-700 truncate max-w-[100px]">{user?.name?.split(" ")[0] ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-semibold text-slate-700 truncate max-w-[100px]">{user?.role ?? "—"}</span>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-3 pt-3 space-y-1">
            {[
              { label: "Fleet Dashboard", href: "/" },
              { label: "Equipment",       href: "/equipment" },
              { label: "Alerts",          href: "/alerts" },
              { label: "Maintenance",     href: "/maintenance" },
            ].map((l) => (
              <Link key={l.href} href={l.href}
                className="flex items-center justify-between px-2 py-1.5 rounded-lg text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                {l.label}
                <ChevronRight className="w-3 h-3" />
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
