import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Bot, Trash2, WifiOff, AlertTriangle,
  FlaskConical, Waves, Thermometer, Wind, Filter,
} from "lucide-react";
import { useSensorData, SENSORS, SensorName } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";
import {
  useCreateAnthropicConversation,
  getListAnthropicConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ChatMessage, getConvStore, setConvStore } from "../stores/conversationStore";
import { useTheme } from "../contexts/ThemeContext";

// ── Constants ─────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

const METRIC_LABELS: Record<MetricType, string> = {
  pH: "pH Level", Turbidity: "Turbidity", Temperature: "Temperature", DO: "Dissolved O₂", TDS: "TDS",
};

const METRIC_COLORS: Record<MetricType, string> = {
  pH: "#2563eb", Turbidity: "#0d9488", Temperature: "#f59e0b", DO: "#f43f5e", TDS: "#7c3aed",
};

const METRIC_ICONS: Record<MetricType, React.ElementType> = {
  pH: FlaskConical, Turbidity: Waves, Temperature: Thermometer, DO: Wind, TDS: Filter,
};

const METRIC_UNITS: Record<MetricType, string> = {
  pH: "", Turbidity: " NTU", Temperature: "°C", DO: " mg/L", TDS: " ppm",
};

const STATUS_COLORS = { SAFE: "#16a34a", WARNING: "#d97706", DANGER: "#dc2626" } as const;

const EMERGENCY_KEYWORDS = ["danger", "unsafe", "critical", "immediately", "emergency", "urgent", "hazardous", "contaminated"];

function isEmergencyMsg(content: string): boolean {
  return EMERGENCY_KEYWORDS.some((kw) => content.toLowerCase().includes(kw));
}

const QUICK_PROMPTS = [
  "Is this water safe to drink?",
  "What's causing high turbidity?",
  "Predict pH trend for next 2 hours",
  "Explain dissolved oxygen levels",
  "Generate a water quality report",
  "What should I do right now?",
];

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex items-end gap-2"
      data-testid="typing-indicator"
    >
      {/* Bot avatar */}
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mb-0.5"
        style={{ background: "#e0e7ff", border: "1px solid #c7d2fe" }}>
        <Bot className="w-3.5 h-3.5 text-[#2563eb]" />
      </div>
      {/* Bubble */}
      <div
        className="px-4 py-3 rounded-[18px] rounded-bl-[4px] flex items-center gap-1.5"
        style={{ background: "#f1f5f9" }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block w-2 h-2 rounded-full"
            style={{ background: "#94a3b8" }}
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 0.85, delay: i * 0.18, ease: "easeInOut" }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Right panel — Live Readings ───────────────────────────────────────────────

interface PanelProps {
  chatSensor: SensorName;
  onSensorChange: (s: SensorName) => void;
}

function LivePanel({ chatSensor, onSensorChange }: PanelProps) {
  const { currentReadings, anomalies, rainEvent, offlineSensor } = useSensorData();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const snap = currentReadings[chatSensor];
  const active = anomalies.filter((a) => !a.resolved);

  return (
    <aside
      className="hidden lg:flex flex-col w-[38%] shrink-0 rounded-xl border overflow-hidden"
      style={{
        background:  "var(--app-surface)",
        borderColor: "var(--app-border)",
        boxShadow:   "0 1px 4px rgba(0,0,0,0.05)",
      }}
      data-testid="live-readings-panel"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--app-border)" }}
      >
        <div className="flex items-center gap-2.5">
          <motion.span
            className="w-2 h-2 rounded-full bg-[#16a34a] shrink-0"
            animate={{ opacity: [1, 0.4, 1], scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
          <span className="text-sm font-semibold" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
            Live Readings
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}>
          {chatSensor.split(" ").pop()}
        </span>
      </div>

      {/* Sensor selector */}
      <div className="px-4 pt-3 pb-2 shrink-0 flex flex-col gap-1">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--app-text-3)" }}>
          AI Context Sensor
        </p>
        {SENSORS.map((s) => {
          const isActive = chatSensor === s;
          const isOffline = s === offlineSensor;
          return (
            <button
              key={s}
              onClick={() => onSensorChange(s)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
              style={{
                background:  isActive ? "rgba(37,99,235,0.08)" : "transparent",
                color:       isActive ? "#2563eb" : "var(--app-text-2)",
                border:      `1px solid ${isActive ? "rgba(37,99,235,0.18)" : "transparent"}`,
              }}
            >
              {isOffline && <WifiOff className="w-3 h-3 shrink-0" />}
              {s}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2563eb] shrink-0" />
              )}
            </button>
          );
        })}
      </div>

      <div className="mx-4 shrink-0" style={{ height: 1, background: "var(--app-border-subtle)" }} />

      {/* Metric rows */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-0.5" style={{ scrollbarWidth: "thin" }}>
        {snap.offline ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <WifiOff className="w-7 h-7" style={{ color: "var(--app-text-3)" }} />
            <p className="text-xs font-medium" style={{ color: "var(--app-text-3)" }}>Sensor Offline</p>
          </div>
        ) : (
          METRICS.map((m) => {
            const reading   = snap[m];
            const statColor = STATUS_COLORS[reading.status];
            const mColor    = METRIC_COLORS[m];
            const Icon      = METRIC_ICONS[m];
            return (
              <div
                key={m}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                style={{ background: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc", border: "1px solid var(--app-border-subtle)" }}
              >
                {/* Icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${mColor}12`, border: `1px solid ${mColor}22` }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: mColor }} />
                </div>

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate" style={{ color: "var(--app-text-2)" }}>
                    {METRIC_LABELS[m]}
                  </p>
                </div>

                {/* Value + status dot */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-sm font-bold tabular-nums"
                    style={{ color: "var(--app-text-1)", fontFamily: "DM Mono, monospace" }}
                  >
                    {reading.value.toFixed(m === "TDS" ? 0 : 2)}
                    <span className="text-[10px] font-normal" style={{ color: "var(--app-text-3)" }}>
                      {METRIC_UNITS[m]}
                    </span>
                  </span>
                  {/* Colored status dot */}
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: statColor }}
                    title={reading.status}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Rain event */}
      {rainEvent.active && (
        <div
          className="mx-4 mb-2 px-3 py-2 rounded-lg flex items-center gap-2 shrink-0"
          style={{ background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.18)" }}
        >
          <span className="text-sm">🌧</span>
          <span className="text-[11px] font-semibold text-[#2563eb]">Rain event active</span>
        </div>
      )}

      {/* Active alerts summary */}
      {active.length > 0 && (
        <div
          className="mx-4 mb-3 px-3 py-3 rounded-xl shrink-0"
          style={{ background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.22)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
            <span className="text-[11px] font-bold text-[#dc2626]">
              {active.length} Active Alert{active.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {active.slice(0, 3).map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: a.severity === "CRITICAL" ? "#dc2626" : "#d97706" }} />
                <span className="text-[10px] font-medium truncate" style={{ color: "var(--app-text-2)" }}>
                  {a.metric}: {a.value.toFixed(2)}{METRIC_UNITS[a.metric]}
                </span>
                <span className="text-[9px] font-bold ml-auto shrink-0" style={{ color: a.severity === "CRITICAL" ? "#dc2626" : "#d97706" }}>
                  {a.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-5 py-3 shrink-0 flex items-center gap-2"
        style={{ borderTop: "1px solid var(--app-border)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#16a34a] shrink-0" />
        <span className="text-[10px]" style={{ color: "var(--app-text-3)" }}>
          3 sensors · live feed
        </span>
        <span className="ml-auto text-[10px]" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono" }}>
          5s interval
        </span>
      </div>
    </aside>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function Assistant() {
  const { currentReadings } = useSensorData();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const qc = useQueryClient();
  const createConv = useCreateAnthropicConversation();

  const [messages, setMessages]     = useState<ChatMessage[]>(() => getConvStore().messages);
  const [convId, setConvId]         = useState<number | null>(() => getConvStore().convId);
  const [chatSensor, setChatSensor] = useState<SensorName>(() => getConvStore().chatSensor);
  const [input, setInput]           = useState("");
  const [isTyping, setIsTyping]     = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { setConvStore({ messages }); }, [messages]);
  useEffect(() => { setConvStore({ convId }); }, [convId]);
  useEffect(() => { setConvStore({ chatSensor }); }, [chatSensor]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  const getSystemPrompt = useCallback(() => {
    const snap = currentReadings[chatSensor];
    const lines = snap.offline
      ? "  SENSOR OFFLINE — no live readings available"
      : METRICS.map((m) => `  - ${m}: ${snap[m].value.toFixed(m === "TDS" ? 0 : 2)}${snap[m].unit} (${snap[m].status})`).join("\n");
    return `You are AquaSense AI, an expert water quality monitoring assistant with access to real-time sensor data.\n\nCurrent Readings — ${chatSensor}:\n${lines}\n\nAnswer questions about water quality, explain sensor readings, suggest remediation steps when values are unsafe, and provide concise but expert guidance. If values are in DANGER range, clearly communicate the severity and immediate action required. Use accessible technical language.`;
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
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const id = await ensureConversation();
      const response = await fetch(`${BASE_URL}/api/anthropic/conversations/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, systemPrompt: getSystemPrompt() }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", streaming: true, timestamp: new Date() }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split("\n")) {
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
          } catch { /* skip malformed SSE */ }
        }
      }

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

  // Bubble styles
  const userBubbleBg   = "#2563eb";
  const aiBubbleBg     = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const aiBubbleColor  = isDark ? "#f1f5f9" : "#0f172a";

  return (
    <div
      className="flex gap-5 overflow-hidden"
      style={{ height: "calc(100vh - 9.5rem)" }}
      data-testid="assistant-page"
    >
      {/* ── Left: Chat column ─────────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0 rounded-xl border overflow-hidden"
        style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}
      >
        {/* Chat header */}
        <div
          className="flex items-center justify-between px-5 py-3.5 shrink-0"
          style={{ borderBottom: "1px solid var(--app-border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#e0e7ff", border: "1px solid #c7d2fe" }}>
              <Bot className="w-4 h-4 text-[#2563eb]" />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--app-text-1)", fontFamily: "var(--app-font-display)" }}>
                AquaSense AI
              </p>
              <p className="text-[10px]" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono, monospace" }}>
                claude-sonnet-4-5 · {chatSensor}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-[10px]" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono" }}>
                {msgCount} msg{msgCount !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
              style={{ color: "var(--app-text-2)", borderColor: "var(--app-border)" }}
              data-testid="clear-chat"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto min-h-0 px-5 py-5 space-y-4"
          style={{ scrollbarWidth: "thin", scrollbarColor: "var(--app-border) transparent" }}
          data-testid="chat-messages"
        >
          {/* Empty state */}
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center gap-4 pb-8"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: "#e0e7ff", border: "1px solid #c7d2fe" }}
              >
                <Bot className="w-7 h-7 text-[#2563eb]" />
              </motion.div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--app-text-1)" }}>
                  Ask me about your water quality
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--app-text-3)" }}>
                  I have live access to {chatSensor} sensor data
                </p>
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => {
              const isUser     = msg.role === "user";
              const emergency  = !isUser && !msg.streaming && isEmergencyMsg(msg.content);

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.role}`}
                >
                  {/* AI avatar — left side */}
                  {!isUser && (
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mb-0.5"
                      style={{
                        background: emergency ? "rgba(220,38,38,0.12)" : "#e0e7ff",
                        border: `1px solid ${emergency ? "rgba(220,38,38,0.30)" : "#c7d2fe"}`,
                        flexShrink: 0,
                      }}
                    >
                      {emergency
                        ? <AlertTriangle className="w-3.5 h-3.5 text-[#dc2626]" />
                        : <Bot className="w-3.5 h-3.5 text-[#2563eb]" />}
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    className="max-w-[78%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      background:   isUser    ? userBubbleBg
                                  : emergency ? "rgba(220,38,38,0.08)"
                                  : aiBubbleBg,
                      color:        isUser    ? "#ffffff"
                                  : emergency ? "#b91c1c"
                                  : aiBubbleColor,
                      borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      border: isUser ? "none"
                            : emergency ? "1px solid rgba(220,38,38,0.22)"
                            : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"}`,
                    }}
                  >
                    {emergency && (
                      <div className="flex items-center gap-1.5 mb-2 pb-2" style={{ borderBottom: "1px solid rgba(220,38,38,0.18)" }}>
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-bold tracking-widest">EMERGENCY ALERT</span>
                      </div>
                    )}
                    {msg.content}
                    {msg.streaming && (
                      <motion.span
                        className="inline-block w-2 h-[14px] ml-1 rounded-sm align-text-bottom"
                        style={{ background: isUser ? "rgba(255,255,255,0.7)" : "#2563eb" }}
                        animate={{ opacity: [1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.75 }}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Typing indicator */}
          <AnimatePresence>
            {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
              <TypingIndicator key="typing" />
            )}
          </AnimatePresence>

          {/* Error */}
          {error && (
            <div
              className="text-xs px-4 py-2.5 rounded-xl border"
              style={{ background: "rgba(220,38,38,0.07)", borderColor: "rgba(220,38,38,0.22)", color: "#dc2626" }}
              data-testid="chat-error"
            >
              Error: {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Quick prompts — above input */}
        <div
          className="shrink-0 px-5 pt-3 pb-2 flex flex-wrap gap-2"
          style={{ borderTop: "1px solid var(--app-border)" }}
          data-testid="quick-prompts"
        >
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => sendMessage(prompt)}
              disabled={isTyping}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all disabled:opacity-40"
              style={{
                background:  "rgba(37,99,235,0.08)",
                color:       "#2563eb",
                border:      "1px solid rgba(37,99,235,0.18)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(37,99,235,0.15)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(37,99,235,0.08)"; }}
              data-testid={`quick-prompt-${prompt.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input bar — sticky at bottom */}
        <div
          className="shrink-0 px-4 py-3 flex items-center gap-3"
          style={{ borderTop: "1px solid var(--app-border)" }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
            placeholder="Ask about water quality…"
            disabled={isTyping}
            className="flex-1 text-sm outline-none px-4 py-2.5 rounded-full disabled:opacity-50"
            style={{
              background:   isDark ? "rgba(255,255,255,0.06)" : "#f8fafc",
              border:       `1px solid ${isDark ? "rgba(255,255,255,0.10)" : "#e2e8f0"}`,
              color:        "var(--app-text-1)",
              fontFamily:   "var(--app-font-sans)",
            }}
            data-testid="chat-input"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-35"
            style={{ background: "#2563eb" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#2563eb"; }}
            data-testid="send-button"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 pb-3 flex items-center justify-between">
          <span className="text-[9px] tracking-wide" style={{ color: "var(--app-text-3)" }}>
            Powered by Claude · Anthropic
          </span>
          <span className="text-[9px]" style={{ color: "var(--app-text-3)", fontFamily: "DM Mono" }}>
            End-to-end encrypted
          </span>
        </div>
      </div>

      {/* ── Right: Live panel ─────────────────────────────────────────────── */}
      <LivePanel chatSensor={chatSensor} onSensorChange={setChatSensor} />
    </div>
  );
}
