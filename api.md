# AI Setup Guide

This guide will show you how to enable the AI Chatbot and Assistant features in AquaSense using **OpenRouter**, which is 100% free and very easy to set up.

---

## Quick Start (Under 2 minutes)

### Step 1: Get a Free API Key
We use OpenRouter to access powerful AI models for free. You don't need a credit card.

1. Go to [openrouter.ai](https://openrouter.ai)
2. Click **Sign In** and create a free account.
3. Once logged in, go to **Keys** in your dashboard.
4. Click **Create Key**, name it something like "AquaSense", and copy the key (it will look like `sk-or-v1-...`).

### Step 2: Add the Key to Your Project
Now we need to tell AquaSense to use this key.

1. Open your project folder.
2. Inside the `artifacts/aquasense/` directory, find the file named `.env.example`.
3. Rename or copy this file so it is exactly named `.env`.
4. Open the `.env` file and replace the placeholder text with your actual key:

```text
VITE_AI_BASE_URL=https://openrouter.ai/api/v1
VITE_AI_API_KEY=sk-or-v1-your-actual-key-goes-here
VITE_AI_MODEL=deepseek/deepseek-v4-flash:free
```

*Note: Make sure there are no extra spaces around the equal signs!*

### Step 3: Restart and Enjoy!
If your development server is running, stop it and start it again so it picks up the new key:

```bash
pnpm dev
```

That's it! The AI features are now active. You can click **Assistant** in the sidebar to start chatting, and it will have live access to your sensor data.

---

## Troubleshooting

**"AI not configured" message**
- Make sure your file is named exactly `.env` (with the dot at the beginning).
- Ensure the file is located inside `artifacts/aquasense/` (not in the main root folder).
- Remember to restart your server (`pnpm dev`) after making changes.

**"API error 401: Unauthorized"**
- Double-check that you copied the entire key from OpenRouter and didn't accidentally include any spaces.

**Empty responses**
- Sometimes the free models can be busy. Wait a minute and try asking your question again.
