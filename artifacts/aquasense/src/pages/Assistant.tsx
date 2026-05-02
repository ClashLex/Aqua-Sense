import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Trash2, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";
import {
  useCreateAnthropicConversation,
  getListAnthropicConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChatMessage,
  getConvStore,
  setConvStore,
} from "../stores/conversationStore";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];
const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#00f5ff", Turbidity: "#39ff14", Temperature: "#ffaa00", DO: "#c084fc", TDS: "#60a5fa",
};
const STATUS_COLORS = { SAFE: "#39ff14", WARNING: "#ffaa00", DANGER: "#ff2d55" } as const;

const EMERGENCY_KEYWORDS = ["danger", "unsafe", "critical", "immediately", "emergency", "urgent", "hazardous", "contaminated"];

function isEmergencyMsg(content: string): boolean {
  const lower = content.toLowerCase();
  return EMERGENCY_KEYWORDS.some((kw) => lower.includes(kw));
}

const QUICK_PROMPTS = [
  "Is this water safe to drink?",
  "What's causing high turbidity?",
  "Predict pH trend for next 2 hours",
  "Explain dissolved oxygen levels",
  "Generate a water quality report",
  "What should I do right now?",
];

// ── Live Readings Sidebar ──────────────────────────────────────────────────

interface SidebarProps {
  chatSensor: SensorName;
  onSensorChange: (s: SensorName) => void;
}

function LiveReadingsSidebar({ chatSensor, onSensorChange }: SidebarProps) {
  const { currentReadings, anomalies, rainEvent, offlineSensor } = useSensorData();
  const snap = currentReadings[chatSensor];
  const activeAnomalies = anomalies.filter((a) => !a.resolved);

  return (
    <aside className="hidden lg:flex flex-col gap-3 w-56 shrink-0 overflow-y-auto" style={{ scrollbarWidth: "none" }}>

      {/* Live readings panel */}
      <div
        className="rounded-xl border p-3 flex flex-col gap-3"
        style={{ background: "#0a1628", borderColor: "rgba(0,245,255,0.15)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-[#39ff14]"
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
          <span className="text-[10px] font-mono text-[#e2e8f0] tracking-widest uppercase">
            Live Readings
          </span>
        </div>

        {/* Sensor selector */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-mono text-[#475569] tracking-widest uppercase mb-0.5">
            AI Context Sensor
          </span>
          {SENSORS.map((s) => (
            <button
              key={s}
              onClick={() => onSensorChange(s)}
              className="text-left px-2 py-1 rounded text-[9px] font-mono tracking-wide truncate transition-all"
              style={{
                background: chatSensor === s ? "rgba(0,245,255,0.1)" : "transparent",
                color: chatSensor === s ? "#00f5ff" : "#475569",
                border: `1px solid ${chatSensor === s ? "rgba(0,245,255,0.3)" : "transparent"}`,
              }}
            >
              {s === offlineSensor ? (
                <span className="flex items-center gap-1">
                  <WifiOff className="w-2.5 h-2.5 inline" /> {s}
                </span>
              ) : s}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-[rgba(0,245,255,0.08)]" />

        {/* Metric rows */}
        <div className="flex flex-col gap-2">
          {snap.offline ? (
            <div className="text-center py-3">
              <WifiOff className="w-5 h-5 text-[#475569] mx-auto mb-1" />
              <span className="text-[9px] font-mono text-[#475569] tracking-widest">SENSOR OFFLINE</span>
            </div>
          ) : (
            METRICS.map((m) => {
              const reading = snap[m];
              const col = STATUS_COLORS[reading.status];
              return (
                <div key={m} className="flex items-center justify-between gap-1">
                  <span className="text-[9px] font-mono tracking-wider shrink-0" style={{ color: METRIC_COLORS[m] }}>
                    {m}
                  </span>
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-[10px] font-mono tabular-nums" style={{ color: col }}>
                      {reading.value.toFixed(m === "TDS" ? 0 : 2)}{reading.unit}
                    </span>
                    <span
                      className="text-[8px] font-mono px-1 py-0.5 rounded shrink-0"
                      style={{ color: col, background: `${col}18`, border: `1px solid ${col}30` }}
                    >
                      {reading.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rain event indicator */}
        {rainEvent.active && (
          <div
            className="rounded-lg px-2 py-1.5 flex items-center gap-1.5 text-[9px] font-mono text-[#60a5fa] tracking-wider"
            style={{ background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.3)" }}
          >
            <span>🌧</span>
            <span>Rain event active</span>
          </div>
        )}
      </div>

      {/* Active anomalies panel */}
      {activeAnomalies.length > 0 && (
        <div
          className="rounded-xl border p-3 flex flex-col gap-2"
          style={{ background: "#0a1628", borderColor: "rgba(255,45,85,0.2)" }}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-[#ff2d55]" />
            <span className="text-[10px] font-mono text-[#ff2d55] tracking-widest uppercase">
              {activeAnomalies.length} Active Alert{activeAnomalies.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {activeAnomalies.slice(0, 4).map((a) => {
              const sc = STATUS_COLORS[a.severity === "CRITICAL" ? "DANGER" : "WARNING"];
              return (
                <div key={a.id} className="flex items-start gap-1.5">
                  <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: sc }} />
                  <span className="text-[9px] font-mono text-[#94a3b8] leading-tight">
                    {a.metric} {a.value.toFixed(2)} — {a.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className="flex items-center gap-1.5 px-1">
        <Wifi className="w-3 h-3 text-[#39ff14]" />
        <span className="text-[9px] font-mono text-[#334155] tracking-wider">All sensors connected</span>
      </div>
    </aside>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function Assistant() {
  const { currentReadings } = useSensorData();
  const qc = useQueryClient();
  const createConv = useCreateAnthropicConversation();

  // Persisted state — read from module store on mount
  const [messages, setMessages] = useState<ChatMessage[]>(() => getConvStore().messages);
  const [convId, setConvId] = useState<number | null>(() => getConvStore().convId);
  const [chatSensor, setChatSensor] = useState<SensorName>(() => getConvStore().chatSensor);

  // Transient state
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync state changes back to the module store
  useEffect(() => { setConvStore({ messages }); }, [messages]);
  useEffect(() => { setConvStore({ convId }); }, [convId]);
  useEffect(() => { setConvStore({ chatSensor }); }, [chatSensor]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getSystemPrompt = useCallback(() => {
    const snap = currentReadings[chatSensor];
    const anomalyLines = snap.offline
      ? "  SENSOR OFFLINE — no live readings available"
      : METRICS.map((m) => `  - ${m}: ${snap[m].value.toFixed(m === "TDS" ? 0 : 2)}${snap[m].unit} (${snap[m].status})`).join("\n");

    return `You are AquaSense AI, an expert water quality monitoring assistant with access to real-time sensor data.

Current Readings — ${chatSensor}:
${anomalyLines}

Answer questions about water quality, explain sensor readings, suggest remediation steps when values are unsafe, and provide concise but expert guidance. If values are in DANGER range, clearly communicate the severity and immediate action required. Use accessible technical language.`;
  }, [currentReadings, chatSensor]);

  const ensureConversation = useCallback(async (): Promise<number> => {
    if (convId !== null) return convId;
    return new Promise((resolve, reject) => {
      createConv.mutate(
        { data: { title: "AquaSense Session " + new Date().toLocaleTimeString() } },
        {
          onSuccess: (conv) => {
            setConvId(conv.id);
            qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
            resolve(conv.id);
          },
          onError: (err) => reject(err),
        },
      );
    });
  }, [convId, createConv, qc]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setError(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const id = await ensureConversation();

      const response = await fetch(
        `${BASE_URL}/api/anthropic/conversations/${id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text, systemPrompt: getSystemPrompt() }),
        },
      );

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", streaming: true, timestamp: new Date() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) break;
            if (data.error) throw new Error(data.error);
            if (data.content) {
              accumulated += data.content;
              setMessages((prev) => {
                const updated = [...prev];
                const idx = updated.findIndex((m) => m.id === assistantId);
                if (idx !== -1) updated[idx] = { ...updated[idx], content: accumulated };
                return updated;
              });
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      // Mark streaming done
      setMessages((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((m) => m.id === assistantId);
        if (idx !== -1) updated[idx] = { ...updated[idx], content: accumulated, streaming: false };
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get response");
      setMessages((prev) => prev.filter((m) => !m.streaming));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  }, [isTyping, ensureConversation, getSystemPrompt]);

  const clearChat = () => {
    setMessages([]);
    setConvId(null);
    setError(null);
    setConvStore({ messages: [], convId: null });
  };

  const msgCount = messages.filter((m) => !m.streaming).length;

  return (
    <div
      className="flex gap-4 overflow-hidden"
      style={{ height: "calc(100vh - 8rem)" }}
      data-testid="assistant-page"
    >
      {/* ── Chat area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#00f5ff]" />
            <span
              style={{ fontFamily: "var(--app-font-display)" }}
              className="text-[#00f5ff] text-sm tracking-widest uppercase"
            >
              AquaSense AI
            </span>
            <span className="text-[#334155] text-[10px] font-mono tracking-wider hidden sm:block">
              claude-sonnet-4-5
            </span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-[#334155] text-[10px] font-mono">
                {msgCount} msg{msgCount !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all"
              data-testid="clear-chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,245,255,0.15) transparent" }}
          data-testid="chat-messages"
        >
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12"
            >
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className="w-16 h-16 rounded-full border flex items-center justify-center"
                style={{ borderColor: "rgba(0,245,255,0.3)", background: "rgba(0,245,255,0.05)" }}
              >
                <Bot className="w-8 h-8 text-[#00f5ff]" />
              </motion.div>
              <p className="text-[#e2e8f0] font-mono text-sm tracking-wider">
                Ask me about your water quality
              </p>
              <p className="text-[#64748b] font-mono text-xs">
                I have real-time access to {chatSensor} sensor readings
              </p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const emergency = msg.role === "assistant" && !msg.streaming && isEmergencyMsg(msg.content);
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.role}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        background: emergency ? "rgba(255,45,85,0.15)" : "rgba(0,245,255,0.1)",
                        border: `1px solid ${emergency ? "rgba(255,45,85,0.5)" : "rgba(0,245,255,0.3)"}`,
                      }}
                    >
                      {emergency
                        ? <AlertTriangle className="w-4 h-4 text-[#ff2d55]" />
                        : <Bot className="w-4 h-4 text-[#00f5ff]" />}
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-xl px-4 py-3 text-sm font-mono leading-relaxed whitespace-pre-wrap ${emergency ? "animate-pulse-danger" : ""}`}
                    style={
                      msg.role === "user"
                        ? {
                            background: "rgba(0,245,255,0.1)",
                            border: "1px solid rgba(0,245,255,0.3)",
                            color: "#e2e8f0",
                          }
                        : emergency
                        ? {
                            background: "rgba(255,45,85,0.07)",
                            border: "1px solid rgba(255,45,85,0.5)",
                            color: "#e2e8f0",
                            boxShadow: "0 0 24px rgba(255,45,85,0.2), inset 0 0 8px rgba(255,45,85,0.05)",
                          }
                        : {
                            background: "#0d1f3c",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: "#e2e8f0",
                          }
                    }
                  >
                    {emergency && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-[rgba(255,45,85,0.3)]">
                        <AlertTriangle className="w-3 h-3 text-[#ff2d55]" />
                        <span className="text-[9px] font-bold tracking-widest text-[#ff2d55]">
                          EMERGENCY ALERT
                        </span>
                      </div>
                    )}
                    {msg.content}
                    {msg.streaming && (
                      <motion.span
                        className="inline-block w-2 h-4 ml-1 bg-[#00f5ff]"
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )}
                  </div>

                  {msg.role === "user" && (
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                      style={{
                        background: "rgba(0,245,255,0.15)",
                        border: "1px solid rgba(0,245,255,0.3)",
                      }}
                    >
                      <User className="w-4 h-4 text-[#00f5ff]" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div
                className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
                style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)" }}
              >
                <Bot className="w-4 h-4 text-[#00f5ff]" />
              </div>
              <div
                className="rounded-xl px-4 py-3 flex items-center gap-1.5"
                style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.08)" }}
                data-testid="typing-indicator"
              >
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-[#00f5ff]"
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </motion.div>
          )}

          {error && (
            <div
              className="text-[#ff2d55] text-xs font-mono px-4 py-2 rounded border border-[rgba(255,45,85,0.3)] bg-[rgba(255,45,85,0.05)]"
              data-testid="chat-error"
            >
              Error: {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="shrink-0 flex flex-wrap gap-2 py-2.5" data-testid="quick-prompts">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isTyping}
              className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wide border transition-all hover:bg-[rgba(0,245,255,0.08)] hover:text-[#00f5ff] hover:border-[rgba(0,245,255,0.4)] disabled:opacity-40"
              style={{ borderColor: "rgba(0,245,255,0.18)", color: "#64748b" }}
              data-testid={`quick-prompt-${prompt.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input */}
        <div
          className="shrink-0 flex gap-2 items-center rounded-xl border p-2"
          style={{ background: "#0d1f3c", borderColor: "rgba(0,245,255,0.2)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about water quality..."
            disabled={isTyping}
            className="flex-1 bg-transparent text-[#e2e8f0] text-sm font-mono placeholder:text-[#334155] outline-none px-2 disabled:opacity-50"
            data-testid="chat-input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 hover:bg-[rgba(0,245,255,0.3)]"
            style={{ background: "rgba(0,245,255,0.18)", border: "1px solid rgba(0,245,255,0.4)" }}
            data-testid="send-button"
          >
            <Send className="w-4 h-4 text-[#00f5ff]" />
          </button>
        </div>

        {/* Powered by Claude badge */}
        <div className="shrink-0 flex items-center justify-between mt-1.5 px-1">
          <span className="text-[#1e293b] text-[9px] font-mono tracking-wider">
            {msgCount > 0 ? `${msgCount} message${msgCount !== 1 ? "s" : ""} this session` : "Start a conversation below"}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#334155] text-[9px] font-mono tracking-widest">POWERED BY</span>
            <span
              className="text-[10px] font-bold tracking-widest"
              style={{ color: "#475569", fontFamily: "var(--app-font-display)" }}
            >
              CLAUDE
            </span>
            <span className="text-[#1e293b] text-[9px] font-mono">· Anthropic</span>
          </div>
        </div>
      </div>

      {/* ── Desktop sidebar ───────────────────────────────────────────── */}
      <LiveReadingsSidebar chatSensor={chatSensor} onSensorChange={setChatSensor} />
    </div>
  );
}
