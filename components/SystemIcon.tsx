"use client";

type IconName =
  | "upload"
  | "overview"
  | "charts"
  | "insights"
  | "anomalies"
  | "model"
  | "refresh"
  | "download"
  | "security"
  | "file"
  | "spark"
  | "chevronDown"
  | "copy";

export default function SystemIcon({
  name,
  size = 18,
  strokeWidth = 1.8,
  className,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {name === "upload" && (
        <>
          <path d="M12 16V4" />
          <path d="m7 9 5-5 5 5" />
          <path d="M4 17.5A2.5 2.5 0 0 0 6.5 20h11A2.5 2.5 0 0 0 20 17.5" />
        </>
      )}
      {name === "overview" && (
        <>
          <rect x="4" y="5" width="7" height="6" rx="2" />
          <rect x="13" y="5" width="7" height="14" rx="2" />
          <rect x="4" y="13" width="7" height="6" rx="2" />
        </>
      )}
      {name === "charts" && (
        <>
          <path d="M5 18V9" />
          <path d="M12 18V5" />
          <path d="M19 18v-7" />
          <path d="M4 18h16" />
        </>
      )}
      {name === "insights" && (
        <>
          <path d="M12 3 14 8l5 1-3.5 3.5.8 5-4.3-2.5L8.7 17.5l.8-5L6 9l5-1 1-5Z" />
        </>
      )}
      {name === "anomalies" && (
        <>
          <path d="M12 4 21 19H3L12 4Z" />
          <path d="M12 10v4" />
          <path d="M12 17h.01" />
        </>
      )}
      {name === "model" && (
        <>
          <path d="M4 16c1.5-4 4.5-6 8-6s6.5 2 8 6" />
          <path d="M4 8c1.5 2 4.5 3 8 3s6.5-1 8-3" />
          <path d="M12 5v14" />
        </>
      )}
      {name === "refresh" && (
        <>
          <path d="M20 11a8 8 0 1 0 2 5.3" />
          <path d="M20 4v7h-7" />
        </>
      )}
      {name === "download" && (
        <>
          <path d="M12 4v11" />
          <path d="m7 10 5 5 5-5" />
          <path d="M4 20h16" />
        </>
      )}
      {name === "security" && (
        <>
          <path d="M12 3 6 6v5c0 4 2.6 7.7 6 9 3.4-1.3 6-5 6-9V6l-6-3Z" />
          <path d="M9.5 12.5 11 14l3.5-3.5" />
        </>
      )}
      {name === "file" && (
        <>
          <path d="M8 3.5h6l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V5A1.5 1.5 0 0 1 7.5 3.5Z" />
          <path d="M14 3.5V8h4" />
        </>
      )}
      {name === "spark" && (
        <>
          <path d="m12 3 1.4 4.6L18 9l-4.6 1.4L12 15l-1.4-4.6L6 9l4.6-1.4L12 3Z" />
          <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
        </>
      )}
      {name === "chevronDown" && (
        <>
          <path d="m6 9 6 6 6-6" />
        </>
      )}
      {name === "copy" && (
        <>
          <rect x="9" y="9" width="10" height="11" rx="2" />
          <path d="M7 15H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v1" />
        </>
      )}
    </svg>
  );
}
