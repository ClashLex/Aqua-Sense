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

  useEffect(() => { convIdRef.current = convId; }, [convId]);
  useEffect(() => { store.messages = messages; }, [messages]);
  useEffect(() => { store.convId = convId; }, [convId]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

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
              background: "rgba(255, 255, 255, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid #e2e8f0",
              boxShadow: "0 20px 60px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.07)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-2.5 shrink-0 border-b bg-[#f8fafc]"
              style={{ borderColor: "#e2e8f0" }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  animate={{ opacity: [1, 0.35, 1], scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                  className="w-1.5 h-1.5 rounded-full bg-[#16a34a]"
                />
                <span
                  style={{ fontFamily: "var(--app-font-display)" }}
                  className="text-[#2563eb] text-[11px] font-bold tracking-wide"
                >
                  AquaSense Copilot
                </span>
                <span className="text-[#94a3b8] text-[9px]" style={{ fontFamily: "DM Mono, monospace" }}>claude</span>
              </div>
              <div className="flex items-center gap-3">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-[#94a3b8] hover:text-[#64748b] text-[9px] font-medium transition-colors"
                  >
                    clear
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[#94a3b8] hover:text-[#0f172a] transition-colors"
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
                    className="w-10 h-10 rounded-full border border-[#bfdbfe] bg-[#eff6ff] flex items-center justify-center"
                  >
                    <Bot className="w-5 h-5 text-[#2563eb]" />
                  </motion.div>
                  <p className="text-[#64748b] text-[11px] leading-relaxed font-medium">
                    Quick questions, instant answers
                  </p>
                  <p className="text-[#94a3b8] text-[10px]">
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
                      <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center mt-0.5 bg-[#eff6ff] border border-[#bfdbfe]">
                        <Bot className="w-3 h-3 text-[#2563eb]" />
                      </div>
                    )}
                    <div
                      className="max-w-[85%] rounded-xl px-3 py-2 text-[11px] leading-relaxed whitespace-pre-wrap"
                      style={
                        msg.role === "user"
                          ? {
                              background: "#eff6ff",
                              border: "1px solid #bfdbfe",
                              color: "#0f172a",
                            }
                          : {
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              color: "#374151",
                            }
                      }
                    >
                      {msg.content}
                      {msg.streaming && (
                        <motion.span
                          className="inline-block w-1.5 h-3.5 ml-0.5 bg-[#2563eb] rounded-sm"
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
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-[#eff6ff] border border-[#bfdbfe]">
                    <Bot className="w-3 h-3 text-[#2563eb]" />
                  </div>
                  <div className="rounded-xl px-3 py-2 flex items-center gap-1 bg-white border border-[#e2e8f0]">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-[#2563eb]"
                        animate={{ y: [0, -4, 0] }}
                        transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {error && (
                <div className="text-[#dc2626] text-[10px] font-medium px-1">
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
                  className="px-2.5 py-1 rounded-full text-[9px] font-medium border border-[#e2e8f0] text-[#64748b] transition-all hover:bg-[#eff6ff] hover:text-[#2563eb] hover:border-[#bfdbfe] disabled:opacity-40"
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Input */}
            <div
              className="shrink-0 flex gap-2 items-center mx-3 my-2.5 rounded-xl border px-3 py-2 bg-white"
              style={{ borderColor: "#e2e8f0" }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
                placeholder="Ask a quick question..."
                disabled={isTyping}
                className="flex-1 bg-transparent text-[#0f172a] text-[11px] placeholder:text-[#cbd5e1] outline-none disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || isTyping}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-all disabled:opacity-35 bg-[#2563eb] hover:bg-[#1d4ed8] text-white"
              >
                <Send className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Action Button ── */}
      <motion.button
        onClick={() => setIsOpen((o) => !o)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="relative flex items-center gap-2 pl-4 pr-5 py-3 rounded-full"
        style={{
          background: isOpen
            ? "#eff6ff"
            : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
          border: `1px solid ${isOpen ? "#bfdbfe" : "transparent"}`,
          color: isOpen ? "#2563eb" : "#ffffff",
          boxShadow: isOpen
            ? "0 2px 8px rgba(37,99,235,0.18)"
            : "0 4px 16px rgba(37,99,235,0.38), 0 2px 8px rgba(37,99,235,0.22)",
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
          className="text-[11px] font-semibold"
          style={{ fontFamily: "var(--app-font-display)" }}
        >
          {isOpen ? "Close" : "Ask AI"}
        </span>

        {/* Unread badge */}
        {!isOpen && answerCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center bg-[#2563eb] text-white border-2 border-white"
          >
            {answerCount > 9 ? "9+" : answerCount}
          </motion.span>
        )}

        {/* Pulse ring when closed */}
        {!isOpen && (
          <motion.span
            className="absolute inset-0 rounded-full border border-[rgba(37,99,235,0.4)]"
            animate={{ scale: [1, 1.18, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeOut" }}
          />
        )}
      </motion.button>
    </div>
  );
}
