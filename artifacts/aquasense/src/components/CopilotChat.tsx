import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import { useSensorData, SENSORS } from "../hooks/useSensorData";
import {
  useCreateAnthropicConversation,
  getListAnthropicConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface CopilotMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

// Module-level store — copilot conversation persists across page navigation
const store: { messages: CopilotMsg[]; convId: number | null } = {
  messages: [],
  convId: null,
};

const QUICK_PROMPTS = [
  "Current water quality?",
  "Any anomalies now?",
  "Is it safe to drink?",
  "Check all sensors",
];

const METRICS = ["pH", "Turbidity", "Temperature", "DO", "TDS"] as const;

export function CopilotChat() {
  const [location] = useLocation();
  const { currentReadings } = useSensorData();
  const qc = useQueryClient();
  const createConv = useCreateAnthropicConversation();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<CopilotMsg[]>(() => store.messages);
  const [convId, setConvId] = useState<number | null>(() => store.convId);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const convIdRef = useRef<number | null>(convId);

  // Keep ref in sync for use inside async callbacks
  useEffect(() => { convIdRef.current = convId; }, [convId]);

  // Persist to module store
  useEffect(() => { store.messages = messages; }, [messages]);
  useEffect(() => { store.convId = convId; }, [convId]);

  // Auto-scroll on new content
  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  // Focus input when popup opens
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Don't render FAB on the full Assistant page — it has its own chat
  if (location === "/assistant" || location.startsWith("/assistant")) return null;

  const getSystemPrompt = () => {
    const snap = currentReadings[SENSORS[0]];
    const lines = METRICS.map(
      (m) => `  - ${m}: ${snap[m].value.toFixed(m === "TDS" ? 0 : 2)}${snap[m].unit} (${snap[m].status})`
    ).join("\n");
    return `You are AquaSense Copilot, a concise water quality assistant. Be brief — answer in 2-4 sentences maximum. If values are in DANGER, say so clearly and suggest immediate action.

Live readings (${SENSORS[0]}):
${lines}`;
  };

  const ensureConversation = async (): Promise<number> => {
    if (convIdRef.current !== null) return convIdRef.current;
    return new Promise((resolve, reject) => {
      createConv.mutate(
        { data: { title: "Copilot " + new Date().toLocaleTimeString() } },
        {
          onSuccess: (conv) => {
            convIdRef.current = conv.id;
            setConvId(conv.id);
            qc.invalidateQueries({ queryKey: getListAnthropicConversationsQueryKey() });
            resolve(conv.id);
          },
          onError: reject,
        }
      );
    });
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;
    setError(null);
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: text }]);
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
      const aId = `a-${Date.now()}`;

      setMessages((prev) => [
        ...prev,
        { id: aId, role: "assistant", content: "", streaming: true },
      ]);

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
                const u = [...prev];
                const i = u.findIndex((m) => m.id === aId);
                if (i !== -1) u[i] = { ...u[i], content: accumulated };
                return u;
              });
            }
          } catch { /* skip malformed */ }
        }
      }

      setMessages((prev) => {
        const u = [...prev];
        const i = u.findIndex((m) => m.id === aId);
        if (i !== -1) u[i] = { ...u[i], content: accumulated, streaming: false };
        return u;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      setMessages((prev) => prev.filter((m) => !m.streaming));
    } finally {
      setIsTyping(false);
      inputRef.current?.focus();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setConvId(null);
    convIdRef.current = null;
    store.messages = [];
    store.convId = null;
    setError(null);
  };

  const answerCount = messages.filter((m) => m.role === "assistant" && !m.streaming).length;

  return (
    <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] flex flex-col items-end gap-3">

      {/* ── Popup ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 10 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="w-[316px] md:w-[360px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              height: "430px",
              background: "rgba(2, 8, 23, 0.88)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              border: "1px solid rgba(0, 245, 255, 0.18)",
              boxShadow:
                "0 8px 40px rgba(0, 245, 255, 0.08), 0 0 0 1px rgba(0,245,255,0.04), 0 24px 60px rgba(0,0,0,0.65)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b"
              style={{
                borderColor: "rgba(0,245,255,0.1)",
                background: "rgba(0,245,255,0.04)",
              }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="w-1.5 h-1.5 rounded-full bg-[#39ff14]"
                />
                <span
                  style={{ fontFamily: "var(--app-font-display)" }}
                  className="text-[#00f5ff] text-[11px] tracking-widest uppercase"
                >
                  AquaSense Copilot
                </span>
                <span className="text-[#1e293b] text-[9px] font-mono">claude</span>
              </div>
              <div className="flex items-center gap-3">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-[#334155] hover:text-[#64748b] text-[9px] font-mono tracking-wider transition-colors"
                  >
                    clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#475569] hover:text-[#94a3b8] transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages area */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0"
              style={{ scrollbarWidth: "none" }}
            >
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-2 pb-6">
                  <motion.div
                    animate={{ scale: [1, 1.07, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="w-10 h-10 rounded-full border flex items-center justify-center"
                    style={{
                      borderColor: "rgba(0,245,255,0.22)",
                      background: "rgba(0,245,255,0.05)",
                    }}
                  >
                    <Bot className="w-5 h-5 text-[#00f5ff]" />
                  </motion.div>
                  <p className="text-[#475569] text-[11px] font-mono leading-relaxed">
                    Quick questions, instant answers
                  </p>
                  <p className="text-[#2d3f5e] text-[10px] font-mono">
                    Reading from {SENSORS[0]}
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div
                        className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                        style={{
                          background: "rgba(0,245,255,0.08)",
                          border: "1px solid rgba(0,245,255,0.22)",
                        }}
                      >
                        <Bot className="w-3 h-3 text-[#00f5ff]" />
                      </div>
                    )}
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[11px] font-mono leading-relaxed whitespace-pre-wrap"
                      style={
                        msg.role === "user"
                          ? {
                              background: "rgba(0,245,255,0.1)",
                              border: "1px solid rgba(0,245,255,0.22)",
                              color: "#e2e8f0",
                            }
                          : {
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              color: "#cbd5e1",
                            }
                      }
                    >
                      {msg.content}
                      {msg.streaming && (
                        <motion.span
                          className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#00f5ff]"
                          animate={{ opacity: [1, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8 }}
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing dots */}
              {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2"
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(0,245,255,0.08)",
                      border: "1px solid rgba(0,245,255,0.22)",
                    }}
                  >
                    <Bot className="w-3 h-3 text-[#00f5ff]" />
                  </div>
                  <div
                    className="rounded-xl px-3 py-2 flex items-center gap-1"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#00f5ff]"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-[#ff2d55] text-[10px] font-mono px-1">
                  ⚠ {error}
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Quick prompts */}
            <div className="shrink-0 flex flex-wrap gap-1.5 px-3 pt-1.5">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  disabled={isTyping}
                  className="px-2.5 py-1 rounded-full text-[9px] font-mono border transition-all hover:bg-[rgba(0,245,255,0.07)] hover:text-[#00f5ff] hover:border-[rgba(0,245,255,0.35)] disabled:opacity-40"
                  style={{ borderColor: "rgba(0,245,255,0.15)", color: "#475569" }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div
              className="shrink-0 flex gap-2 items-center mx-3 my-2.5 rounded-xl border px-3 py-2"
              style={{
                background: "rgba(0,0,0,0.28)",
                borderColor: "rgba(0,245,255,0.16)",
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Ask a quick question..."
                disabled={isTyping}
                className="flex-1 bg-transparent text-[#e2e8f0] text-[11px] font-mono placeholder:text-[#1e293b] outline-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-35 hover:bg-[rgba(0,245,255,0.25)]"
                style={{
                  background: "rgba(0,245,255,0.14)",
                  border: "1px solid rgba(0,245,255,0.28)",
                }}
              >
                <Send className="w-3 h-3 text-[#00f5ff]" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Action Button ── */}
      <motion.button
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.07 }}
        whileTap={{ scale: 0.93 }}
        className="relative flex items-center gap-2 pl-4 pr-5 py-3 rounded-full"
        style={{
          background: isOpen
            ? "rgba(0, 245, 255, 0.22)"
            : "linear-gradient(135deg, rgba(0,245,255,0.18) 0%, rgba(0,245,255,0.07) 100%)",
          border: "1px solid rgba(0, 245, 255, 0.45)",
          color: "#00f5ff",
          boxShadow: isOpen
            ? "0 0 24px rgba(0,245,255,0.4), 0 0 48px rgba(0,245,255,0.15)"
            : "0 0 18px rgba(0,245,255,0.28), 0 0 36px rgba(0,245,255,0.1)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
        data-testid="copilot-fab"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="flex items-center"
            >
              <X className="w-4 h-4" />
            </motion.span>
          ) : (
            <motion.span
              key="bot"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.14 }}
              className="flex items-center"
            >
              <Bot className="w-4 h-4" />
            </motion.span>
          )}
        </AnimatePresence>
        <span
          className="text-[11px] font-mono tracking-wider"
          style={{ fontFamily: "var(--app-font-display)" }}
        >
          {isOpen ? "Close" : "Ask AI"}
        </span>

        {/* Unread badge — shows answer count when closed */}
        {!isOpen && answerCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ background: "#00f5ff", color: "#020817" }}
          >
            {answerCount > 9 ? "9+" : answerCount}
          </motion.span>
        )}

        {/* Pulse ring when not open */}
        {!isOpen && (
          <motion.span
            className="absolute inset-0 rounded-full border border-[rgba(0,245,255,0.3)]"
            animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
          />
        )}
      </motion.button>
    </div>
  );
}
