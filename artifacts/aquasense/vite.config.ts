import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: "api-chat-proxy",
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && new URL(req.url, "http://localhost").pathname === "/api/chat") {
              if (req.method !== "POST") {
                res.statusCode = 405;
                res.end("Method Not Allowed");
                return;
              }

              const apiKey = env.VITE_AI_API_KEY;
              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ error: "Local VITE_AI_API_KEY not found in .env file." }));
                return;
              }

              let bodyStr = "";
              req.on("data", (chunk) => { bodyStr += chunk; });
              req.on("end", async () => {
                try {
                  const body = JSON.parse(bodyStr);
                  const apiBase = env.VITE_AI_BASE_URL || "https://openrouter.ai/api/v1";
                  const model = env.VITE_AI_MODEL || "google/gemini-2.5-flash:free";

                  const response = await fetch(`${apiBase}/chat/completions`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "Authorization": `Bearer ${apiKey}`,
                    },
                    body: JSON.stringify({
                      model: body.model || model,
                      messages: body.messages,
                      stream: body.stream !== false,
                      max_tokens: body.max_tokens || 1024,
                      temperature: body.temperature ?? 0.7,
                    }),
                  });

                  res.statusCode = response.status;
                  response.headers.forEach((val, key) => {
                    res.setHeader(key, val);
                  });

                  if (response.body) {
                    const reader = response.body.getReader();
                    while (true) {
                      const { done, value } = await reader.read();
                      if (done) break;
                      res.write(value);
                    }
                  }
                  res.end();
                } catch (err: any) {
                  res.statusCode = 500;
                  res.setHeader("Content-Type", "application/json");
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } else {
              next();
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port: Number(process.env.PORT) || 5173,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port: Number(process.env.PORT) || 4173,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
