"use client";

import React, { useState, useRef, useCallback } from "react";

interface TooltipCoords {
  top: number;
  left: number;
  flip: boolean;
}

interface Props {
  children: React.ReactNode;
  content: string;
}

export default function Tooltip({ children, content }: Props) {
  const [coords, setCoords] = useState<TooltipCoords | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    // position: fixed coordinates are always viewport-relative — no scrollY needed
    setCoords({
      top: rect.top, // viewport top of the trigger
      left: rect.left + rect.width / 2, // horizontal center of trigger
      flip: rect.top < 160,
    });
  }, []);

  const hide = useCallback(() => setCoords(null), []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        tabIndex={0}
        role="button"
        aria-label={`Definition: ${content}`}
        style={{
          cursor: "help",
          borderBottom: "1px dotted var(--accent)",
          paddingBottom: 2,
          transition: "color 0.15s ease",
          outline: "none",
          display: "inline",
        }}
      >
        {children}
      </span>

      {coords && (
        <span
          role="tooltip"
          style={{
            // fixed = viewport-relative, escapes all overflow/stacking contexts
            position: "fixed",
            left: coords.left,
            top: coords.flip ? coords.top + 24 : coords.top - 8,
            // center horizontally on the trigger, shift up fully if above
            transform: coords.flip
              ? "translateX(-50%)"
              : "translateX(-50%) translateY(-100%)",
            zIndex: 9999,
            background: "var(--surface2, #181b22)",
            border: "1px solid var(--border, rgba(255,255,255,0.07))",
            borderRadius: "var(--radius, 8px)",
            padding: "0.6rem 0.75rem",
            fontSize: 11,
            color: "var(--text2, #9a9892)",
            maxWidth: 220,
            width: "max-content",
            whiteSpace: "normal",
            wordWrap: "break-word",
            lineHeight: 1.5,
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
            animation: "tooltipFade 0.15s ease both",
          }}
        >
          {content}
          {/* arrow pointing toward the trigger */}
          <span
            style={{
              position: "absolute",
              [coords.flip ? "top" : "bottom"]: -4,
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "4px solid transparent",
              borderRight: "4px solid transparent",
              ...(coords.flip
                ? { borderBottom: "4px solid var(--surface2, #181b22)" }
                : { borderTop: "4px solid var(--surface2, #181b22)" }),
            }}
          />
        </span>
      )}

      <style>{`
        @keyframes tooltipFade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>
    </>
  );
}
