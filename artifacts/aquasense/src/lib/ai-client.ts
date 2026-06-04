const API_BASE = import.meta.env.VITE_AI_BASE_URL || "https://openrouter.ai/api/v1";
const API_KEY = import.meta.env.VITE_AI_API_KEY || "";
const MODEL = import.meta.env.VITE_AI_MODEL || "google/gemini-2.5-flash:free";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export function getCustomApiKey(): string {
  try {
    return localStorage.getItem("aquasense-custom-api-key") || "";
  } catch {
    return "";
  }
}

export function setCustomApiKey(key: string) {
  try {
    if (key) {
      localStorage.setItem("aquasense-custom-api-key", key);
    } else {
      localStorage.removeItem("aquasense-custom-api-key");
    }
  } catch {
    // ignore
  }
}

export function isAIConfigured(): boolean {
  return import.meta.env.PROD || API_KEY.length > 0 || getCustomApiKey().length > 0;
}

export function getAIModel(): string {
  return MODEL;
}

export function getAIProvider(): string {
  if (API_BASE.includes("openrouter")) return "OpenRouter";
  if (API_BASE.includes("deepseek")) return "DeepSeek";
  if (API_BASE.includes("dashscope") || API_BASE.includes("aliyun")) return "Qwen";
  return "Custom";
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const customKey = getCustomApiKey();
  const activeKey = API_KEY || customKey;
  const isDirect = activeKey.length > 0;
  const endpoint = isDirect ? `${API_BASE}/chat/completions` : "/api/chat";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (isDirect) {
    headers["Authorization"] = `Bearer ${activeKey}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: MODEL,
      messages,
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    }),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    callbacks.onError(new Error(`API error ${response.status}: ${text || response.statusText}`));
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError(new Error("No response body"));
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") {
          callbacks.onDone();
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) callbacks.onToken(delta);
        } catch {
          // skip malformed JSON lines
        }
      }
    }
    callbacks.onDone();
  } catch (err) {
    if ((err as Error).name === "AbortError") return;
    callbacks.onError(err as Error);
  }
}

export function buildSensorContext(
  currentReadings: Record<string, { pH: { value: number; status: string }; Turbidity: { value: number; status: string }; Temperature: { value: number; status: string }; DO: { value: number; status: string }; TDS: { value: number; status: string }; offline: boolean }>,
  score: number,
): string {
  const lines: string[] = ["Current sensor readings:"];

  for (const [name, snap] of Object.entries(currentReadings)) {
    if (snap.offline) {
      lines.push(`- ${name}: OFFLINE`);
      continue;
    }
    lines.push(
      `- ${name}: pH ${snap.pH.value} (${snap.pH.status}), ` +
        `Turbidity ${snap.Turbidity.value} NTU (${snap.Turbidity.status}), ` +
        `Temp ${snap.Temperature.value}°C (${snap.Temperature.status}), ` +
        `DO ${snap.DO.value} mg/L (${snap.DO.status}), ` +
        `TDS ${snap.TDS.value} ppm (${snap.TDS.status})`,
    );
  }
  lines.push(`Overall Water Quality Score: ${score}/100`);
  return lines.join("\n");
}

export function buildSystemPrompt(sensorContext: string): string {
  return `You are AquaSense AI, an expert water quality assistant embedded in a real-time monitoring platform.

Your role:
- Answer questions about water quality, safety, and the sensor data shown
- Explain what metric readings mean in plain language
- Give actionable safety advice when readings are in WARNING or DANGER ranges
- Be concise (2-4 sentences unless asked for detail)
- If a user asks about a specific sensor, focus on that one
- If readings show danger, always prioritize safety advice first

Thresholds for reference:
- pH: Safe 6.5-8.5, Warning 6.0-6.5 or 8.5-9.0, Danger <6.0 or >9.0
- Turbidity: Safe <4 NTU, Warning 4-10, Danger >10
- Temperature: Safe 15-25°C, Warning 25-35, Danger >35
- Dissolved Oxygen: Safe >6 mg/L, Warning 4-6, Danger <4
- TDS: Safe <500 ppm, Warning 500-1000, Danger >1000

${sensorContext}`;
}
