"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  useApiKey,
  PROVIDERS,
  AIProvider,
  validateApiKeyForProvider,
} from "@/lib/ApiKeyContext";
import SystemIcon from "@/components/SystemIcon";

const MASK_DOT = "•";

export default function ApiKeyPanel() {
  const {
    provider,
    apiKey,
    providerConfig,
    setProvider,
    setApiKey,
    clearApiKey,
    hasKey,
  } = useApiKey();
  const [draft, setDraft] = useState("");
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const trimmedDraft = draft.trim();
  const keyValidation = validateApiKeyForProvider(providerConfig, trimmedDraft);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleProviderSwitch = (nextProvider: AIProvider) => {
    setProvider(nextProvider);
    setDraft("");
    setVisible(false);
  };

  const panel = open ? (
    <>
      <button
        type="button"
        className="apikey-scrim"
        aria-label="Close AI key panel"
        onClick={() => setOpen(false)}
      />
      <div
        id="apikey-dialog"
        className="apikey-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="apikey-heading"
      >
        <div className="apikey-panel-header">
          <div className="apikey-panel-copy">
            <p className="section-kicker">AI settings</p>
            <h3 id="apikey-heading" className="apikey-heading">
              Session-only provider key
            </h3>
          </div>
          <button
            type="button"
            className="apikey-close"
            onClick={() => setOpen(false)}
          >
            Done
          </button>
        </div>

        <p className="apikey-sub">
          Your key stays in memory for this session, is forwarded through the
          app only to complete the selected request, and is never stored by the
          app.
        </p>

        <div className="provider-tabs provider-tabs--sheet">
          {PROVIDERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`provider-tab ${
                provider === entry.id ? "provider-tab--active" : ""
              }`}
              onClick={() => handleProviderSwitch(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {hasKey ? (
          <div className="apikey-active-row">
            <div className="apikey-masked">
              <SystemIcon name="security" size={14} />
              <span>
                {apiKey.slice(0, 8)}
                {MASK_DOT.repeat(8)}
                {apiKey.slice(-4)}
              </span>
            </div>
            <button
              type="button"
              className="apikey-btn apikey-btn--secondary"
              onClick={() => {
                clearApiKey();
                setDraft("");
              }}
            >
              Remove key
            </button>
          </div>
        ) : (
          <div className="apikey-input-row">
            <div className="apikey-input-wrap">
              <input
                className="apikey-input"
                name="apiKey"
                aria-label={`${providerConfig.label} API key`}
                type={visible ? "text" : "password"}
                placeholder={providerConfig.placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="button"
                className="apikey-toggle"
                aria-label={visible ? "Hide API key" : "Show API key"}
                onClick={() => setVisible((current) => !current)}
              >
                {visible ? "Hide" : "Show"}
              </button>
            </div>
            {trimmedDraft && !keyValidation.valid && (
              <p className="apikey-validation">{keyValidation.message}</p>
            )}
            <button
              type="button"
              className="apikey-btn"
              onClick={() => {
                if (!keyValidation.valid) return;
                setApiKey(trimmedDraft);
                setDraft("");
                setOpen(false);
              }}
              disabled={!trimmedDraft || !keyValidation.valid}
            >
              Save Key
            </button>
          </div>
        )}

        <div className="apikey-footer">
          <a
            href={providerConfig.docsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="apikey-link"
          >
            Open {providerConfig.label} key docs
          </a>
          <p className="apikey-privacy">
            Core analysis stays available in-browser even if AI is unavailable,
            and the workspace falls back to rule-based insights.
          </p>
        </div>
      </div>
    </>
  ) : null;

  return (
    <div className="apikey-wrap">
      <button
        type="button"
        className={`apikey-pill ${hasKey ? "apikey-pill--active" : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls="apikey-dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <SystemIcon name="security" size={14} />
        <span>{hasKey ? `${providerConfig.label} connected` : "Connect AI"}</span>
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
