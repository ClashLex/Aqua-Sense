# API Connection Guide

This guide walks you through connecting a free AI API to AquaSense so the chatbot and copilot features work.

## Quick Start (2 minutes)

### Step 1: Get a Free API Key

**Option A — OpenRouter (Recommended, no credit card)**

1. Go to [openrouter.ai](https://openrouter.ai)
2. Click **Sign In** and create a free account
3. Go to **API Keys** in the dashboard
4. Click **Create Key**, name it "AquaSense", copy the key (starts with `sk-or-v1-`)

You get free access to `deepseek/deepseek-v4-flash:free` — a 284B parameter model with 1M token context. No payment required.

**Option B — DeepSeek Direct**

1. Go to [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up for an account
3. Go to **API Keys** and create one
4. Copy the key (starts with `sk-`)

You get 5M free tokens on signup. After that, V4 Flash costs $0.14 per 1M input tokens.

**Option C — Qwen/DashScope (Alibaba Cloud)**

1. Go to [dashscope.aliyuncs.com](https://dashscope.aliyuncs.com)
2. Create an Alibaba Cloud account (may need phone verification)
3. Activate Model Studio
4. Go to **Key Management** and create an API key

You get 1M free tokens per model for 90 days.

### Step 2: Create Your .env File

In the project root (`artifacts/aquasense/`), create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env` with your key:

**For OpenRouter:**
```
VITE_AI_BASE_URL=https://openrouter.ai/api/v1
VITE_AI_API_KEY=sk-or-v1-your-actual-key
VITE_AI_MODEL=deepseek/deepseek-v4-flash:free
```

**For DeepSeek Direct:**
```
VITE_AI_BASE_URL=https://api.deepseek.com
VITE_AI_API_KEY=sk-your-actual-key
VITE_AI_MODEL=deepseek-v4-flash
```

**For Qwen/DashScope:**
```
VITE_AI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
VITE_AI_API_KEY=sk-your-actual-key
VITE_AI_MODEL=qwen-turbo
```

### Step 3: Restart the Dev Server

```bash
pnpm dev
```

The AI features are now active. Click **Assistant** in the sidebar to start chatting.

---

## How It Works

### Architecture

```
Browser (React)
    │
    ├─ Assistant page ─── fetch() ──→ OpenRouter API ──→ DeepSeek V4 Flash
    │                                         ↑
    └─ CopilotChat ───── fetch() ────────────┘
```

There is **no backend server** for AI. The browser calls the API directly. This works because OpenRouter, DeepSeek, and DashScope all support CORS for browser requests.

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_AI_BASE_URL` | Yes | `https://openrouter.ai/api/v1` | API endpoint |
| `VITE_AI_API_KEY` | Yes | (none) | Your API key |
| `VITE_AI_MODEL` | No | `deepseek/deepseek-v4-flash:free` | Model to use |

### System Prompt

Every chat message automatically includes live sensor data in the system prompt:

```
You are AquaSense AI, an expert water quality assistant...

Current sensor readings:
- River Station A: pH 7.2 (SAFE), Turbidity 8.4 NTU (WARNING), ...
- Treatment Plant B: pH 7.0 (SAFE), ...
- Distribution Point C: ...
Overall Water Quality Score: 71/100
```

This means the AI gives answers grounded in your actual current readings, not generic advice.

---

## Provider Comparison

| Feature | OpenRouter | DeepSeek | Qwen/DashScope |
|---------|-----------|----------|----------------|
| Free tier | Yes (`:free` model) | 5M tokens | 1M per model |
| Credit card needed | No | No | No (but needs Alibaba account) |
| CORS from browser | Yes | Yes | Yes |
| Model quality | Frontier (V4 Flash) | Frontier (V4 Flash) | Good (qwen-turbo) |
| Streaming support | Yes | Yes | Yes |
| Rate limits | ~100 req/day free | Generous | Generous |

---

## Using Other OpenAI-Compatible APIs

Any API that follows the OpenAI chat completions format will work. Set the three env vars:

```
VITE_AI_BASE_URL=https://your-api-provider.com/v1
VITE_AI_API_KEY=your-key
VITE_AI_MODEL=model-name
```

Examples that work: Groq, Together AI, Fireworks AI, LM Studio (local), Ollama (local).

---

## Troubleshooting

**"AI not configured" message on the Assistant page**
- Your `.env` file is missing or the API key is empty
- Make sure the file is at `artifacts/aquasense/.env` (not the project root)
- Restart the dev server after changing `.env`

**"API error 401: Unauthorized"**
- Your API key is invalid or expired
- Regenerate the key on your provider's dashboard

**"API error 429: Rate limited"**
- You've hit the free tier rate limit
- Wait a minute and try again, or upgrade your plan

**Empty responses or "Error: Not found"**
- The model name is wrong
- Check the exact model ID on your provider's website

**CORS errors in browser console**
- Your provider doesn't support browser-side requests
- Switch to OpenRouter, DeepSeek, or DashScope which all support CORS
