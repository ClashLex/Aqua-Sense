import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Trash2 } from "lucide-react";
import { useSensorData, SENSORS } from "../hooks/useSensorData";
import {
  useListAnthropicConversations,
  useCreateAnthropicConversation,
  getListAnthropicConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const QUICK_PROMPTS = [
  "Is this water safe to drink?",
  "What's causing high turbidity?",
  "Predict pH trend for next 2 hours",
  "Explain dissolved oxygen levels",
];

export function Assistant() {
  const { currentReadings } = useSensorData();
  const qc = useQueryClient();

  const conversations = useListAnthropicConversations();
  const createConv = useCreateAnthropicConversation();

  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const getSystemPrompt = useCallback(() => {
    const snap = currentReadings[SENSORS[0]];
    return `You are AquaSense AI, an expert water quality monitoring assistant. You have access to real-time sensor data from the AquaSense platform.

Current Readings (${SENSORS[0]}):
- pH: ${snap.pH.value.toFixed(2)} (${snap.pH.status})
- Turbidity: ${snap.Turbidity.value.toFixed(2)} NTU (${snap.Turbidity.status})
- Temperature: ${snap.Temperature.value.toFixed(2)}°C (${snap.Temperature.status})
- Dissolved Oxygen: ${snap.DO.value.toFixed(2)} mg/L (${snap.DO.status})
- TDS: ${snap.TDS.value.toFixed(0)} ppm (${snap.TDS.status})

Answer questions about water quality, explain readings, suggest actions when values are unsafe, and provide educational information about water monitoring. Be concise but helpful. Use technical but accessible language.`;
  }, [currentReadings]);

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
        }
      );
    });
  }, [convId, createConv, qc]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isTyping) return;
    setError(null);
    const userMsg: Message = { role: "user", content: text };
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

      setMessages((prev) => [...prev, { role: "assistant", content: "", streaming: true }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

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
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: accumulated,
                  streaming: true,
                };
                return updated;
              });
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: false };
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
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 8rem)" }} data-testid="assistant-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[#00f5ff]" />
          <span style={{ fontFamily: "var(--app-font-display)" }} className="text-[#00f5ff] text-sm tracking-widest uppercase">
            AquaSense AI
          </span>
          <span className="text-[#64748b] text-[10px] font-mono tracking-wider">
            claude-sonnet-4-6
          </span>
        </div>
        <button
          onClick={clearChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-mono text-[#64748b] hover:text-[#e2e8f0] border border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.2)] transition-all"
          data-testid="clear-chat"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear
        </button>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0"
        style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(0,245,255,0.2) transparent" }}
        data-testid="chat-messages"
      >
        {messages.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full text-center space-y-3 py-12"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="w-16 h-16 rounded-full border flex items-center justify-center"
              style={{ borderColor: "rgba(0,245,255,0.3)", background: "rgba(0,245,255,0.05)" }}
            >
              <Bot className="w-8 h-8 text-[#00f5ff]" />
            </motion.div>
            <p className="text-[#e2e8f0] font-mono text-sm tracking-wider">Ask me about your water quality</p>
            <p className="text-[#64748b] font-mono text-xs">I have access to real-time sensor readings</p>
          </motion.div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              data-testid={`message-${msg.role}-${i}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5"
                  style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)" }}
                >
                  <Bot className="w-4 h-4 text-[#00f5ff]" />
                </div>
              )}

              <div
                className="max-w-[80%] rounded-xl px-4 py-3 text-sm font-mono leading-relaxed"
                style={
                  msg.role === "user"
                    ? { background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.3)", color: "#e2e8f0" }
                    : { background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }
                }
              >
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
                  style={{ background: "rgba(0,245,255,0.15)", border: "1px solid rgba(0,245,255,0.3)" }}
                >
                  <User className="w-4 h-4 text-[#00f5ff]" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && messages[messages.length - 1]?.role !== "assistant" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3"
          >
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
          <div className="text-[#ff2d55] text-xs font-mono px-4 py-2 rounded border border-[rgba(255,45,85,0.3)] bg-[rgba(255,45,85,0.05)]" data-testid="chat-error">
            Error: {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="shrink-0 flex flex-wrap gap-2 py-3" data-testid="quick-prompts">
        {QUICK_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            onClick={() => sendMessage(prompt)}
            disabled={isTyping}
            className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider border transition-all hover:bg-[rgba(0,245,255,0.1)] disabled:opacity-40"
            style={{ borderColor: "rgba(0,245,255,0.2)", color: "#64748b" }}
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
          className="flex-1 bg-transparent text-[#e2e8f0] text-sm font-mono placeholder:text-[#64748b] outline-none px-2 disabled:opacity-50"
          data-testid="chat-input"
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || isTyping}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all disabled:opacity-40"
          style={{ background: "rgba(0,245,255,0.2)", border: "1px solid rgba(0,245,255,0.4)" }}
          data-testid="send-button"
        >
          <Send className="w-4 h-4 text-[#00f5ff]" />
        </button>
      </div>
    </div>
  );
}
