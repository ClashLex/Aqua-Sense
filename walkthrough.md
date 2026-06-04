# Hosting Walkthrough

This guide covers how to deploy AquaSense to various hosting platforms.

## Prerequisites

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- A free API key (see `api.md`)

---

## Option 1: Vercel (Easiest)

### Setup

1. Push your code to a GitHub repository

2. Go to [vercel.com](https://vercel.com) and sign in with GitHub

3. Click **Add New → Project**

4. Import your repository

5. Configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** `artifacts/aquasense`
   - **Build Command:** `pnpm build`
   - **Output Directory:** `dist/public`

6. Add environment variables:
   ```
   VITE_AI_BASE_URL = https://openrouter.ai/api/v1
   VITE_AI_API_KEY = sk-or-v1-your-key
   VITE_AI_MODEL = deepseek/deepseek-v4-flash:free
   ```

7. Click **Deploy**

Vercel auto-detects Vite and deploys. Your app is live at `your-project.vercel.app`.

### Custom Domain

1. Go to your project → **Settings → Domains**
2. Add your domain
3. Update DNS as instructed (A record or CNAME)

---

## Option 2: Netlify

### Setup

1. Push your code to GitHub

2. Go to [netlify.com](https://netlify.com) and sign in

3. Click **Add new site → Import an existing project**

4. Select your repository

5. Configure build settings:
   - **Base directory:** `artifacts/aquasense`
   - **Build command:** `pnpm build`
   - **Publish directory:** `dist/public`

6. Add environment variables in **Site settings → Environment variables**:
   ```
   VITE_AI_BASE_URL = https://openrouter.ai/api/v1
   VITE_AI_API_KEY = sk-or-v1-your-key
   VITE_AI_MODEL = deepseek/deepseek-v4-flash:free
   ```

7. Click **Deploy site**

### netlify.toml (Optional)

Create `artifacts/aquasense/netlify.toml`:

```toml
[build]
  command = "pnpm build"
  publish = "dist/public"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## Option 3: Cloudflare Pages

### Setup

1. Push your code to GitHub

2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)

3. Click **Create a project → Connect to Git**

4. Select your repository

5. Configure:
   - **Build command:** `cd artifacts/aquasense && pnpm install && pnpm build`
   - **Build output directory:** `artifacts/aquasense/dist/public`

6. Add environment variables:
   ```
   VITE_AI_BASE_URL = https://openrouter.ai/api/v1
   VITE_AI_API_KEY = sk-or-v1-your-key
   VITE_AI_MODEL = deepseek/deepseek-v4-flash:free
   ```

7. Click **Save and Deploy**

---

## Option 4: Self-Hosted (VPS / Docker)

### Dockerfile

Create this at the project root:

```dockerfile
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY artifacts/aquasense/package.json ./artifacts/aquasense/
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_AI_BASE_URL=https://openrouter.ai/api/v1
ARG VITE_AI_API_KEY
ARG VITE_AI_MODEL=deepseek/deepseek-v4-flash:free
ENV VITE_AI_BASE_URL=$VITE_AI_BASE_URL
ENV VITE_AI_API_KEY=$VITE_AI_API_KEY
ENV VITE_AI_MODEL=$VITE_AI_MODEL
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/artifacts/aquasense/dist/public /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### nginx.conf

```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Build and Run

```bash
docker build \
  --build-arg VITE_AI_API_KEY=sk-or-v1-your-key \
  -t aquasense .

docker run -p 8080:80 aquasense
```

App is live at `http://localhost:8080`.

### Without Docker

```bash
cd artifacts/aquasense

# Set env vars
export VITE_AI_BASE_URL=https://openrouter.ai/api/v1
export VITE_AI_API_KEY=sk-or-v1-your-key
export VITE_AI_MODEL=deepseek/deepseek-v4-flash:free

# Build
pnpm install
pnpm build

# Serve with any static server
npx serve dist/public
# or
npx vite preview
```

---

## Option 5: GitHub Pages

### Setup

1. Install the gh-pages package:
   ```bash
   pnpm add -D gh-pages
   ```

2. Add to `artifacts/aquasense/package.json` scripts:
   ```json
   "deploy": "gh-pages -d dist/public"
   ```

3. Build and deploy:
   ```bash
   cd artifacts/aquasense
   pnpm build
   pnpm deploy
   ```

4. Go to your repo → **Settings → Pages** → set source to `gh-pages` branch

**Note:** GitHub Pages doesn't support environment variables at build time for free accounts. You'll need to hardcode the API key or use a different host for AI features.

---

## Post-Deployment Checklist

1. **Verify the site loads** — Check the homepage renders correctly
2. **Check AI features** — Click Assistant, ask a question, confirm streaming works
3. **Test dark/light mode** — Toggle in the top bar
4. **Check mobile view** — Resize browser to verify responsive layout
5. **Verify sensors work** — Dashboard should show live updating readings
6. **Check alerts** — Click "Demo: Trigger Alert" to verify anomaly detection

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `VITE_AI_BASE_URL` | `.env` | AI API endpoint |
| `VITE_AI_API_KEY` | `.env` | Your API key (never commit this) |
| `VITE_AI_MODEL` | `.env` | Model identifier |

**Important:** Vite only reads `.env` at build time. If you change env vars, you must rebuild and redeploy.

---

## Cost Estimates

| Platform | Free Tier | Paid |
|----------|-----------|------|
| Vercel | 100 GB bandwidth/mo | $20/mo |
| Netlify | 100 GB bandwidth/mo | $19/mo |
| Cloudflare Pages | Unlimited bandwidth | $0 (free) |
| GitHub Pages | 100 GB bandwidth/mo | Free |
| Self-hosted | N/A | ~$5/mo VPS |

AI API costs are separate and minimal:
- OpenRouter free tier: $0
- DeepSeek V4 Flash: ~$0.0004 per chat message
- Qwen Turbo: ~$0.0003 per chat message
