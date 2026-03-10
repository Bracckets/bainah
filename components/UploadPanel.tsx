'use client';
// ─── UploadPanel ─────────────────────────────────────────────────────────────

import React, { useRef, useState } from 'react';

interface Props {
  onFile: (file: File) => void;
  isLoading: boolean;
}

export default function UploadPanel({ onFile, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'csv' || ext === 'xlsx' || ext === 'xls') onFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="upload-zone" style={{ borderColor: dragging ? 'var(--accent)' : undefined }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <div className="upload-icon">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      </div>
      <p className="upload-title">{isLoading ? 'Analysing dataset…' : 'Drop your CSV or Excel file here'}</p>
      <p className="upload-sub">or click to browse · up to 10 MB</p>
    </div>
  );
}
