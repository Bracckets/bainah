// ─── /api/ai — server-side proxy ─────────────────────────────────────────────
// Forwards requests to AI providers from the server, bypassing CORS.
// The API key never leaves the server response — it's sent by the client
// in the request body and forwarded immediately, never logged or stored.

import { NextRequest, NextResponse } from "next/server";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

const ALLOWED_PROVIDERS = new Set(["claude", "openai", "groq", "gemini"]);
const ALLOWED_MODELS: Record<string, Set<string>> = {
  claude: new Set(["claude-3-5-haiku-latest", "claude-haiku-4-5-20251001"]),
  openai: new Set(["gpt-4o-mini"]),
  gemini: new Set(["gemini-3-flash-preview"]),
  groq: new Set(["llama-3.1-8b-instant", "llama3-8b-8192"]),
};
const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_SYSTEM_CHARS = 6_000;
const MAX_MESSAGE_CHARS = 24_000;
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

type ProxyPayload = {
  provider: string;
  apiKey: string;
  model: string;
  system?: string;
  messages: Array<{ role: string; content: string }>;
};

function buildOpenAiCompatibleMessages(
  messages: Array<{ role: string; content: string }>,
  system?: string
) {
  const systemMessage =
    system && system.trim()
      ? [{ role: "system" as const, content: system.trim() }]
      : [];

  return [...systemMessage, ...messages];
}

function buildGeminiContents(messages: Array<{ role: string; content: string }>) {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));
}

function reject(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

function isAllowedOrigin(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (!origin) return true;

  const host = req.headers.get("host");
  if (!host) return false;

  try {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  } catch {
    return false;
  }
}

function parsePayload(rawBody: string): ProxyPayload | null {
  try {
    return JSON.parse(rawBody) as ProxyPayload;
  } catch {
    return null;
  }
}

function isValidMessage(
  entry: unknown
): entry is {
  role: string;
  content: string;
} {
  if (!entry || typeof entry !== "object") return false;

  const { role, content } = entry as { role?: unknown; content?: unknown };

  return (
    typeof role === "string" &&
    ALLOWED_ROLES.has(role) &&
    typeof content === "string" &&
    content.trim().length > 0 &&
    content.length <= MAX_MESSAGE_CHARS
  );
}

function validatePayload(payload: ProxyPayload) {
  if (!payload.apiKey || !payload.provider || !payload.model) {
    return "Missing apiKey, provider, or model.";
  }

  if (!ALLOWED_PROVIDERS.has(payload.provider)) {
    return "Unknown provider.";
  }

  if (!ALLOWED_MODELS[payload.provider]?.has(payload.model)) {
    return "Unsupported model.";
  }

  if (payload.apiKey.length > 256) {
    return "Invalid API key.";
  }

  if (payload.system && payload.system.length > MAX_SYSTEM_CHARS) {
    return "System prompt is too large.";
  }

  if (!Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 12) {
    return "Invalid message payload.";
  }

  if (!payload.messages.every(isValidMessage)) {
    return "Invalid message payload.";
  }

  return null;
}

export async function POST(req: NextRequest) {
  if (!isAllowedOrigin(req)) {
    return reject("Cross-origin requests are not allowed.", 403);
  }

  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return reject("Content-Type must be application/json.");
  }

  const rawBody = await req.text();
  if (!rawBody || rawBody.length > MAX_REQUEST_BYTES) {
    return reject("Request payload is too large.", 413);
  }

  const payload = parsePayload(rawBody);
  if (!payload) {
    return reject("Malformed JSON body.");
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return reject(validationError);
  }

  try {
    const { provider, apiKey, model, messages, system } = payload;
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
      const compatibleMessages = buildOpenAiCompatibleMessages(messages, system);

      upstream = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify(
          provider === "groq"
            ? {
                model,
                max_completion_tokens: 1800,
                temperature: 0.3,
                messages: compatibleMessages,
              }
            : {
                model,
                max_tokens: 1800,
                temperature: 0.3,
                messages: compatibleMessages,
              }
        ),
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
          ...(system?.trim()
            ? { system_instruction: { parts: [{ text: system.trim() }] } }
            : {}),
          contents: buildGeminiContents(messages),
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
