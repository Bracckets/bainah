'use client';

import React from 'react';

interface Props {
  sheets: string[];
  onSelect: (sheetName: string) => void;
}

export default function SheetPicker({ sheets, onSelect }: Props) {
  return (
    <div className="sheet-picker-overlay">
      <div className="sheet-picker-modal">
        <h2 className="sheet-picker-title">Select a Sheet</h2>
        <p className="sheet-picker-subtitle">This Excel file contains multiple sheets. Choose which one to analyze:</p>
        <div className="sheet-picker-buttons">
          {sheets.map((sheet) => (
            <button
              key={sheet}
              className="sheet-picker-button"
              onClick={() => onSelect(sheet)}
            >
              {sheet}
            </button>
          ))}
        </div>
      </div>
      <style jsx>{`
        .sheet-picker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(2px);
        }

        .sheet-picker-modal {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 2rem;
          max-width: 480px;
          width: 90%;
          box-shadow: var(--shadow);
          animation: slideUp 0.3s ease both;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .sheet-picker-title {
          font-family: var(--font-display);
          font-size: 1.2rem;
          color: var(--text);
          margin-bottom: 0.5rem;
          letter-spacing: 0.02em;
        }

        .sheet-picker-subtitle {
          color: var(--text2);
          font-size: 12px;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        .sheet-picker-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sheet-picker-button {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 0.9rem 1.2rem;
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s ease;
          word-break: break-word;
          text-align: left;
        }

        .sheet-picker-button:hover {
          background: var(--surface);
          border-color: var(--accent);
          color: var(--accent);
        }

        .sheet-picker-button:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}
