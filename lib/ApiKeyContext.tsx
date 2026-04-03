"use client";
// ─── ApiKeyContext ────────────────────────────────────────────────────────────
// Stores provider choice + API key in React state only.
// Nothing is ever written to localStorage, cookies, or any server.

import { createContext, useContext, useState, ReactNode } from "react";

export type AIProvider = "claude" | "openai" | "gemini" | "groq";

export interface ProviderConfig {
  id: AIProvider;
  label: string;
  placeholder: string;
  docsUrl: string;
  color: string;
  model: string;
  endpoint: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    placeholder: "sk-ant-api03-…",
    docsUrl: "https://console.anthropic.com/settings/keys",
    color: "#c9a96e",
    model: "claude-haiku-4-5-20251001",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-proj-…",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "#10a37f",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  {
    id: "gemini",
    label: "Gemini",
    placeholder: "AIza…",
    docsUrl: "https://aistudio.google.com/app/apikey",
    color: "#4285f4",
    model: "gemini-3-flash-preview",
    endpoint:
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent",
  },
  {
    id: "groq",
    label: "Groq",
    placeholder: "gsk_…",
    docsUrl: "https://console.groq.com/keys",
    color: "#f55036",
    model: "llama3-8b-8192",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
];

interface ApiKeyContextValue {
  provider: AIProvider;
  apiKey: string;
  providerConfig: ProviderConfig;
  setProvider: (p: AIProvider) => void;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
  hasKey: boolean;
}

const ApiKeyContext = createContext<ApiKeyContextValue>({
  provider: "claude",
  apiKey: "",
  providerConfig: PROVIDERS[0],
  setProvider: () => {},
  setApiKey: () => {},
  clearApiKey: () => {},
  hasKey: false,
});

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [provider, setProviderState] = useState<AIProvider>("claude");
  const [apiKey, setApiKeyState] = useState("");

  const setProvider = (p: AIProvider) => {
    setProviderState(p);
    setApiKeyState(""); // clear key when switching providers
  };
  const setApiKey = (key: string) => setApiKeyState(key.trim());
  const clearApiKey = () => setApiKeyState("");
  const providerConfig = PROVIDERS.find((p) => p.id === provider)!;

  return (
    <ApiKeyContext.Provider
      value={{
        provider,
        apiKey,
        providerConfig,
        setProvider,
        setApiKey,
        clearApiKey,
        hasKey: apiKey.length > 0,
      }}
    >
      {children}
    </ApiKeyContext.Provider>
  );
}

export function useApiKey() {
  return useContext(ApiKeyContext);
}
