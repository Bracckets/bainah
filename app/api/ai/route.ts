// ─── /api/ai — server-side proxy ─────────────────────────────────────────────
// Forwards requests to AI providers from the server, bypassing CORS.
// The API key never leaves the server response — it's sent by the client
// in the request body and forwarded immediately, never logged or stored.

import { NextRequest, NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const ALLOWED_PROVIDERS = new Set(["claude", "openai", "groq", "gemini"]);

export async function POST(req: NextRequest) {
  const { provider, apiKey, model, messages, system } = await req.json();

  if (!apiKey || !provider) {
    return NextResponse.json(
      { error: "Missing apiKey or provider" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  if (!ALLOWED_PROVIDERS.has(provider)) {
    return NextResponse.json(
      { error: "Unknown provider" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  try {
    let upstream: Response;

    if (provider === "claude") {
      upstream = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens: 1800, system, messages }),
      });

    } else if (provider === "openai" || provider === "groq") {
      const baseUrl = provider === "groq"
        ? "https://api.groq.com/openai/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";

      upstream = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, max_tokens: 1800, messages }),
      });

    } else if (provider === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      upstream = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: system }] },
          contents: [{ parts: [{ text: messages[messages.length - 1].content }] }],
          generationConfig: { maxOutputTokens: 1800, temperature: 0.3 },
        }),
      });

    } else {
      return NextResponse.json(
        { error: "Unknown provider" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const data = await upstream.json();

    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream provider request failed." },
        { status: upstream.status, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(data, { headers: NO_STORE_HEADERS });

  } catch {
    return NextResponse.json(
      { error: "Proxy request failed." },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
