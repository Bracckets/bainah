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
  keyPrefixes: string[];
  keyRuleLabel: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "claude",
    label: "Claude",
    placeholder: "sk-ant-api03-…",
    docsUrl: "https://console.anthropic.com/settings/keys",
    color: "#c9a96e",
    model: "claude-3-5-haiku-latest",
    endpoint: "https://api.anthropic.com/v1/messages",
    keyPrefixes: ["sk-ant-"],
    keyRuleLabel: "Start with sk-ant-",
  },
  {
    id: "openai",
    label: "OpenAI",
    placeholder: "sk-proj-…",
    docsUrl: "https://platform.openai.com/api-keys",
    color: "#10a37f",
    model: "gpt-4o-mini",
    endpoint: "https://api.openai.com/v1/chat/completions",
    keyPrefixes: ["sk-", "sk-proj-"],
    keyRuleLabel: "Start with sk- or sk-proj-",
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
    keyPrefixes: ["AIza"],
    keyRuleLabel: "Start with AIza",
  },
  {
    id: "groq",
    label: "Groq",
    placeholder: "gsk_…",
    docsUrl: "https://console.groq.com/keys",
    color: "#f55036",
    model: "llama-3.1-8b-instant",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    keyPrefixes: ["gsk_"],
    keyRuleLabel: "Start with gsk_",
  },
];

export function validateApiKeyForProvider(
  providerConfig: ProviderConfig,
  rawKey: string
) {
  const key = rawKey.trim();

  if (!key) {
    return { valid: false, message: "Enter an API key to continue." };
  }

  const matchesPrefix = providerConfig.keyPrefixes.some((prefix) =>
    key.startsWith(prefix)
  );

  if (!matchesPrefix) {
    return {
      valid: false,
      message: `${providerConfig.label} keys should ${providerConfig.keyRuleLabel.toLowerCase()}.`,
    };
  }

  return { valid: true, message: "" };
}

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
