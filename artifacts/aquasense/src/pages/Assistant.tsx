import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, Trash2 } from "lucide-react";
import { useSensorData, SENSORS } from "../hooks/useSensorData";
import { MetricType } from "../utils/thresholds";
import {
  streamChat,
  buildSensorContext,
  buildSystemPrompt,
  isAIConfigured,
  getAIModel,
  getAIProvider,
  ChatMessage,
  getCustomApiKey,
  setCustomApiKey,
} from "../lib/ai-client";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const METRICS: MetricType[] = ["pH", "Turbidity", "Temperature", "DO", "TDS"];

const QUICK_PROMPTS = [
  "Is this water safe to drink?",
  "What's causing high turbidity?",
  "Explain the pH readings",
  "Predict the temperature trend",
  "Which sensor has the worst readings?",
  "What should I do about the TDS level?",
];

const STORAGE_KEY = "aquasense-chat-history";

function loadHistory(): Message[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw).map((m: Message) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

function saveHistory(messages: Message[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
  } catch {
    // ignore
  }
}

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

export function Assistant() {
  const { currentReadings } = useSensorData();
  const [messages, setMessages] = useState<Message[]>(loadHistory);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [customKeyInput, setCustomKeyInput] = useState(getCustomApiKey);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    saveHistory(messages);
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const configured = isAIConfigured();

  const handleSend = async (text?: string) => {
    const question = (text || input).trim();
    if (!question || streaming) return;
    if (!configured) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setStreaming(true);

    const sensorSnap = currentReadings;
    const scoreCalc = Object.values(sensorSnap)[0]
      ? calcScore(Object.values(sensorSnap)[0])
      : 0;
    const ctx = buildSensorContext(sensorSnap, scoreCalc);
    const systemPrompt = buildSystemPrompt(ctx);

    const apiMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: question },
    ];

    let assistantContent = "";
    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const abort = new AbortController();
    abortRef.current = abort;

    await streamChat(
      apiMessages,
      {
        onToken: (token) => {
          assistantContent += token;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: assistantContent } : m,
            ),
          );
        },
        onDone: () => {
          setStreaming(false);
          abortRef.current = null;
        },
        onError: (err) => {
          assistantContent = assistantContent || `Error: ${err.message}`;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id ? { ...m, content: assistantContent } : m,
            ),
          );
          setStreaming(false);
          abortRef.current = null;
          if (err.message.includes("API key") || err.message.includes("500")) {
            setShowKeyConfig(true);
          }
        },      },
      abort.signal,
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]" data-testid="assistant-page">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] bg-sky-200"
            style={{ background: "var(--app-primary-tint)" }}
          >
            <Bot className="w-4 h-4 text-[#2563eb] dark:text-sky-200" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: "var(--app-text-1)" }}>
              AI Water Quality Assistant
            </h1>
            <p className="text-[10px] font-bold" style={{ color: "var(--app-text-3)" }}>
              Powered by {getAIProvider()} ({getAIModel()})
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyConfig(!showKeyConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase border-[3px] border-black dark:border-white transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
            style={{
              borderColor: "var(--app-border)",
              color: "var(--app-text-1)",
              background: showKeyConfig ? "var(--app-primary-tint)" : "var(--app-surface)",
              boxShadow: "2px 2px 0px 0px var(--app-border)"
            }}
            data-testid="key-config-btn"
          >
            🔑 {getCustomApiKey() ? "Key Set" : "API Key"}
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase border-[3px] border-black dark:border-white transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] cursor-pointer"
              style={{
                borderColor: "var(--app-border)",
                color: "var(--app-text-1)",
                background: "var(--app-surface)",
                boxShadow: "2px 2px 0px 0px var(--app-border)"
              }}
              data-testid="clear-chat-btn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>
      {/* Key Config */}
      {showKeyConfig && (
        <div
          className="rounded-md border-[3px] border-black dark:border-white px-4 py-4 mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
        >
          <p className="text-xs font-black uppercase tracking-wider mb-2" style={{ color: "var(--app-text-1)" }}>
            Configure Custom API Key (Stored locally)
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Paste OpenRouter API Key (sk-or-...)"
              value={customKeyInput}
              onChange={(e) => setCustomKeyInput(e.target.value)}
              className="flex-1 bg-transparent text-[12px] px-3 py-2 rounded-md outline-none border-2 border-black dark:border-white font-semibold"
              style={{ color: "var(--app-text-1)" }}
            />
            <button
              onClick={() => {
                setCustomApiKey(customKeyInput);
                setShowKeyConfig(false);
              }}
              className="px-4 py-2 rounded-md text-[11px] font-extrabold uppercase border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
              style={{ background: "#2563eb", color: "#fff" }}
            >
              Save
            </button>
            {getCustomApiKey() && (
              <button
                onClick={() => {
                  setCustomApiKey("");
                  setCustomKeyInput("");
                  setShowKeyConfig(false);
                }}
                className="px-4 py-2 rounded-md text-[11px] font-extrabold uppercase border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                style={{ background: "#dc2626", color: "#fff" }}
              >
                Clear Key
              </button>
            )}
          </div>
          <p className="text-[10px] mt-2 font-bold" style={{ color: "var(--app-text-3)" }}>
            Direct browser connections are made to the AI provider endpoint. Your key is only stored in your browser's LocalStorage.
          </p>
        </div>
      )}

      {/* Not configured warning */}
      {!configured && (
        <div
          className="rounded-md border-[3px] border-black dark:border-white px-4 py-6 text-center mb-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]"
          style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
        >
          <Bot className="w-10 h-10 mx-auto mb-3 text-[#2563eb]" />
          <p className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)" }}>
            AI not configured
          </p>
          <p className="text-xs max-w-sm mx-auto font-bold" style={{ color: "var(--app-text-3)" }}>
            Add your API key to the <code className="font-mono bg-[var(--app-surface-2)] px-1 rounded border border-black dark:border-white">.env</code> file:
          </p>
          <pre
            className="mt-3 text-[11px] font-mono p-3 rounded-md text-left max-w-md mx-auto overflow-x-auto border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]"
            style={{ background: "var(--app-surface-2)", color: "var(--app-text-2)" }}
          >
{`VITE_AI_BASE_URL=https://openrouter.ai/api/v1
VITE_AI_API_KEY=sk-or-v1-your-key
VITE_AI_MODEL=deepseek/deepseek-v4-flash:free`}
          </pre>
          <p className="text-[10px] mt-3 font-extrabold uppercase mb-4" style={{ color: "var(--app-text-3)" }}>
            Free key at openrouter.ai — takes 2 minutes
          </p>
          <div className="border-t border-black/10 dark:border-white/10 pt-4 max-w-md mx-auto">
            <p className="text-xs font-bold mb-2" style={{ color: "var(--app-text-1)" }}>
              Or configure it instantly in browser:
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Paste OpenRouter API Key"
                value={customKeyInput}
                onChange={(e) => setCustomKeyInput(e.target.value)}
                className="flex-1 bg-transparent text-[12px] px-3 py-2 rounded-md outline-none border-2 border-black dark:border-white font-semibold"
                style={{ color: "var(--app-text-1)" }}
              />
              <button
                onClick={() => {
                  setCustomApiKey(customKeyInput);
                  window.location.reload();
                }}
                className="px-4 py-2 rounded-md text-[11px] font-extrabold uppercase border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pb-4"
        data-testid="chat-messages"
      >
        {messages.length === 0 && configured && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div
              className="w-14 h-14 rounded-md flex items-center justify-center mb-4 border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] bg-sky-200"
              style={{ background: "var(--app-primary-tint)" }}
            >
              <Bot className="w-7 h-7 text-[#2563eb] dark:text-sky-200" />
            </div>
            <p className="text-sm font-black uppercase tracking-wider mb-1" style={{ color: "var(--app-text-1)" }}>
              Ask about your water quality
            </p>
            <p className="text-xs max-w-xs font-bold" style={{ color: "var(--app-text-3)" }}>
              I have access to live sensor data from 3 monitoring stations. Ask me anything about water safety, trends, or anomalies.
            </p>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border-2 border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] bg-sky-200"
                  style={{ background: "var(--app-primary-tint)" }}
                >
                  <Bot className="w-3.5 h-3.5 text-[#2563eb] dark:text-sky-200" />
                </div>
              )}
              <div
                className="max-w-[80%] rounded-md px-3.5 py-2.5 text-[13px] leading-relaxed border-[3px] border-black dark:border-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] font-semibold"
                style={{
                  background: msg.role === "user" ? "#2563eb" : "var(--app-surface)",
                  color: msg.role === "user" ? "#fff" : "var(--app-text-1)",
                }}
              >
                {msg.content || (
                  <span className="inline-flex items-center gap-1 font-extrabold uppercase">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Thinking...
                  </span>
                )}
              </div>
              {msg.role === "user" && (
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 border-2 border-black dark:border-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] bg-[#faf9f5] dark:bg-[#27272a]"
                >
                  <User className="w-3.5 h-3.5" style={{ color: "var(--app-text-3)" }} />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Quick prompts */}
      {messages.length === 0 && configured && (
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => handleSend(p)}
              disabled={streaming}
              className="px-3 py-1.5 rounded-md text-[11px] font-extrabold uppercase border-2 border-black dark:border-white transition-all hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] disabled:opacity-50 cursor-pointer"
              style={{
                background: "var(--app-surface-2)",
                color: "var(--app-text-1)",
                boxShadow: "2px 2px 0px 0px var(--app-border)"
              }}
              data-testid={`quick-prompt-${p.slice(0, 20).toLowerCase().replace(/\s+/g, "-")}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div
        className="flex items-end gap-2 p-2 rounded-md border-[3px] border-black dark:border-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] mb-1"
        style={{ background: "var(--app-surface)" }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={configured ? "Ask about water quality..." : "Configure API key first..."}
          disabled={!configured || streaming}
          rows={1}
          className="flex-1 resize-none bg-transparent text-[13px] px-2 py-1.5 outline-none placeholder:opacity-50 disabled:cursor-not-allowed font-semibold"
          style={{ color: "var(--app-text-1)", maxHeight: "120px" }}
          data-testid="chat-input"
        />
        <button
          onClick={() => handleSend()}
          disabled={!configured || streaming || !input.trim()}
          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 border-[3px] border-black dark:border-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:-translate-x-[1px] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] dark:active:shadow-[1px_1px_0px_0px_rgba(255,255,255,1)] disabled:opacity-30 transition-all cursor-pointer"
          style={{ background: "#2563eb", color: "#fff" }}
          data-testid="send-message-btn"
        >
          {streaming ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
