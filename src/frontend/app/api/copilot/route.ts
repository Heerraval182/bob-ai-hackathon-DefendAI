import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

// ─── Fetch live fleet context from real backend ───────────────────────────────

async function fetchFleetContext(): Promise<string> {
  try {
    const [reportRes, alertsRes, tasksRes] = await Promise.all([
      fetch(`${BACKEND}/api/reports/readiness`, { cache: "no-store" }),
      fetch(`${BACKEND}/api/alerts`,             { cache: "no-store" }),
      fetch(`${BACKEND}/api/maintenance/recommendations`, { cache: "no-store" }),
    ]);

    const report = reportRes.ok ? await reportRes.json() : null;
    const alerts = alertsRes.ok ? await alertsRes.json() : [];
    const tasks  = tasksRes.ok  ? await tasksRes.json()  : [];

    const s = report?.summary ?? {};
    const lines: string[] = [
      "== LIVE FLEET DATA ==",
      `Total assets: ${s.total ?? "?"}`,
      `Mission Ready: ${s.mission_ready ?? "?"}`,
      `Ready with Warning: ${s.ready_with_warning ?? "?"}`,
      `Maintenance Required: ${s.maintenance_required ?? "?"}`,
      `Not Mission Ready: ${s.not_mission_ready ?? "?"}`,
      "",
      "== EQUIPMENT STATUS ==",
    ];

    if (report?.equipment) {
      for (const eq of report.equipment) {
        lines.push(
          `${eq.equipment_id} (${eq.model}) — ${eq.mission_status} | ` +
          `Risk: ${eq.ai_risk_level ?? "Unknown"} | ` +
          `Failure Prob: ${eq.failure_probability != null ? (eq.failure_probability * 100).toFixed(0) + "%" : "N/A"} | ` +
          `RUL: ${eq.remaining_useful_life ?? "N/A"} days | ` +
          `Pending tasks: ${eq.pending_tasks ?? 0}`
        );
      }
    }

    if (alerts.length) {
      lines.push("", "== ACTIVE ALERTS ==");
      for (const a of alerts.slice(0, 10)) {
        lines.push(`[${a.severity}] ${a.equipment_id} — ${a.alert_type}: ${a.message}`);
      }
    }

    if (tasks.length) {
      lines.push("", "== TOP MAINTENANCE TASKS ==");
      for (const t of tasks.slice(0, 8)) {
        lines.push(`[${t.priority}] ${t.equipment_id} / ${t.component_id} — ${t.task_type}: ${t.recommended_action} (${t.estimated_downtime}h)`);
      }
    }

    return lines.join("\n");
  } catch (err) {
    console.error("Failed to fetch fleet context:", err);
    return "Fleet data temporarily unavailable.";
  }
}

// ─── Local fallback (no Groq key) — routes to our real backend copilot ────────

async function callBackendCopilot(question: string): Promise<string> {
  try {
    const res = await fetch(`${BACKEND}/api/copilot/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Backend copilot error: ${res.status}`);
    const data = await res.json();
    return data.answer ?? "No answer received.";
  } catch (err) {
    console.error("Backend copilot error:", err);
    return "Unable to connect to backend. Make sure the Node.js server is running on port 3001.";
  }
}

// ─── Stream helper ────────────────────────────────────────────────────────────

function streamText(text: string, model = "DefendAI Backend"): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ text, done: false })}\n\n`)
      );
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ done: true, fullText: text, model })}\n\n`)
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { question: string; history?: Array<{ role: string; content: string }> };
  try {
    body = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { question, history = [] } = body;
  if (!question?.trim()) return new Response("question is required", { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  const hasKey = apiKey && apiKey !== "your_groq_api_key_here";

  // ── No API key: use real backend copilot ───────────────────────────────────
  if (!hasKey) {
    const answer = await callBackendCopilot(question);
    return streamText(answer, "DefendAI Backend Copilot");
  }

  // ── Has Groq key: build system prompt with live fleet data + call Groq ─────
  const fleetContext = await fetchFleetContext();

  const systemPrompt = [
    "You are DefendAI Copilot — an AI assistant for military fleet readiness and predictive maintenance.",
    "Use the live fleet data below to answer fleet questions accurately.",
    "For general questions (coding, science, math, etc.), answer from your knowledge.",
    "Always use markdown formatting: headers, bold, bullet lists, tables.",
    "For fleet questions, always cite specific equipment IDs, sensor values, and risk scores.",
    "",
    fleetContext,
  ].join("\n");

  const messages = [
    { role: "system", content: systemPrompt },
    ...history.slice(-20),
    { role: "user", content: question },
  ];

  let groqRes: Response;
  try {
    groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.6,
        max_tokens: 2048,
        stream: true,
      }),
    });
  } catch {
    const answer = await callBackendCopilot(question);
    return streamText(answer, "DefendAI Backend Copilot");
  }

  if (!groqRes.ok) {
    const answer = await callBackendCopilot(question);
    return streamText(answer, "DefendAI Backend Copilot");
  }

  // Proxy Groq SSE stream
  const encoder = new TextEncoder();
  const reader = groqRes.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText, model: "llama-3.3-70b-versatile" })}\n\n`));
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(payload);
              const token: string = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullText += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token, done: false })}\n\n`));
              }
            } catch { /* ignore malformed lines */ }
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullText, model: "llama-3.3-70b-versatile" })}\n\n`));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
  });
}
