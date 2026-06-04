import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { useSensorData } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";
import {
  streamChat,
  buildSensorContext,
  buildSystemPrompt,
  isAIConfigured,
  ChatMessage,
} from "../lib/ai-client";

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

function calcScore(
  snap: { pH: { value: number; status: string }; Turbidity: { value: number; status: string }; Temperature: { value: number; status: string }; DO: { value: number; status: string }; TDS: { value: number; status: string }; offline: boolean },
): number {
  if (snap.offline) return 0;
  const weights: Record<MetricType, number> = { pH: 25, Turbidity: 20, Temperature: 15, DO: 25, TDS: 15 };
  let score = 0;
  for (const m of METRICS) {
    const s = snap[m].status;
    score += s === "SAFE" ? weights[m] : s === "WARNING" ? weights[m] * 0.4 : 0;
  }
  return Math.round(score);
}

export function CopilotChat() {
  const { currentReadings } = useSensorData();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<{ id: string; role: "user" | "assistant"; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const configured = isAIConfigured();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || streaming || !configured) return;

    const userMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", content: question }]);
    setInput("");
    setStreaming(true);

    const snap = currentReadings;
    const firstSnap = Object.values(snap)[0];
    const score = firstSnap ? calcScore(firstSnap) : 0;
    const ctx = buildSensorContext(snap, score);

    const apiMessages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt(ctx) + "\n\nKeep responses concise (2-4 sentences max)." },
      ...messages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
      { role: "user", content: question },
    ];

    let assistantContent = "";
    const assistantMsgId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantMsgId, role: "assistant", content: "" }]);

    const abort = new AbortController();
    abortRef.current = abort;

    await streamChat(
      apiMessages,
      {
        onToken: (token) => {
          assistantContent += token;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantContent } : m)),
          );
        },
        onDone: () => { setStreaming(false); abortRef.current = null; },
        onError: (err) => {
          assistantContent = assistantContent || `Error: ${err.message}`;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, content: assistantContent } : m)),
          );
          setStreaming(false);
          abortRef.current = null;
        },
      },
      abort.signal,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!configured) return null;

  return (
    <>
      {/* FAB */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-20 md:bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] transition-all"
        style={{ background: "#2563eb", color: "#fff" }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        data-testid="copilot-fab"
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-36 md:bottom-20 right-6 z-50 w-[340px] max-w-[calc(100vw-48px)] rounded-md flex flex-col overflow-hidden border-[3px] border-black dark:border-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,1)]"
            style={{
              background: "var(--app-surface)",
              height: "420px",
            }}
            data-testid="copilot-panel"
          >
            {/* Header */}
            <div
              className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{ borderBottom: "3px solid var(--app-border)" }}
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center border-2 border-black" style={{ background: "var(--app-primary-tint)" }}>
                <Bot className="w-3.5 h-3.5 text-[#2563eb]" />
              </div>
              <div>
                <p className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: "var(--app-text-1)" }}>Quick Chat</p>
                <p className="text-[9px] font-bold" style={{ color: "var(--app-text-3)" }}>Water quality assistant</p>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3.5">
              {messages.length === 0 && (
                <p className="text-[11px] text-center py-6 font-bold" style={{ color: "var(--app-text-3)" }}>
                  Ask a quick question about your water quality
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-md px-3 py-2 text-[12px] leading-relaxed border-[2px] border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] font-bold`}
                    style={{
                      background: msg.role === "user" ? "#e0f2fe" : "var(--app-surface-2)",
                      color: "var(--app-text-1)",
                    }}
                  >
                    {msg.content || (
                      <span className="inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              className="flex items-center gap-1.5 px-3 py-2 shrink-0"
              style={{ borderTop: "3px solid var(--app-border)" }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask..."
                disabled={streaming}
                className="flex-1 bg-transparent text-[12px] px-2 py-1.5 rounded-md outline-none placeholder:opacity-50 border-2 border-black dark:border-white font-bold"
                style={{ color: "var(--app-text-1)" }}
                data-testid="copilot-input"
              />
              <button
                onClick={() => handleSend()}
                disabled={streaming || !input.trim()}
                className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 disabled:opacity-30 border-2 border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] transition-all"
                style={{ background: "#2563eb", color: "#fff" }}
                data-testid="copilot-send-btn"
              >
                {streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
