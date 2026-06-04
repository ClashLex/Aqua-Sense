export interface Env {
  VITE_AI_BASE_URL?: string;
  VITE_AI_API_KEY?: string;
  AI_API_KEY?: string;
  VITE_AI_MODEL?: string;
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Proxy the chat API request
    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      const apiKey = env.VITE_AI_API_KEY || env.AI_API_KEY;
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "AI API key not configured on Cloudflare. Please set VITE_AI_API_KEY or AI_API_KEY." }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      const apiBase = env.VITE_AI_BASE_URL || "https://openrouter.ai/api/v1";
      const model = env.VITE_AI_MODEL || "google/gemini-2.5-flash:free";

      try {
        const body = await request.json() as any;

        // Call OpenRouter API
        const response = await fetch(`${apiBase}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": url.origin,
            "X-Title": "AquaSense",
          },
          body: JSON.stringify({
            model: body.model || model,
            messages: body.messages,
            stream: body.stream !== false,
            max_tokens: body.max_tokens || 1024,
            temperature: body.temperature ?? 0.7,
          }),
        });

        // Copy the headers and pipe the streaming body back to the client
        const headers = new Headers(response.headers);
        headers.set("Access-Control-Allow-Origin", "*");
        
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Default fallback to static assets served by Cloudflare Pages/Workers Assets
    return env.ASSETS.fetch(request);
  },
};
