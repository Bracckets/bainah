"use client";

import React, { useRef, useState } from "react";
import SystemIcon from "@/components/SystemIcon";

interface Props {
  onFile: (file: File) => void;
  isLoading: boolean;
}

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export default function UploadPanel({ onFile, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setUploadError("Only CSV and XLSX files are supported.");
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError("Files larger than 15 MB are blocked to protect browser performance.");
      return;
    }

    setUploadError(null);
    onFile(file);
  };

  return (
    <button
      type="button"
      className={`upload-dropzone ${dragging ? "upload-dropzone--active" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        const file = event.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        name="datasetFile"
        aria-hidden="true"
        tabIndex={-1}
        accept=".csv,.xlsx"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      <div className="upload-dropzone-icon">
        <SystemIcon name="upload" size={24} />
      </div>
      <div className="upload-dropzone-copy">
        <p className="upload-dropzone-title">
          {isLoading ? "Analyzing dataset..." : "Drop a CSV or XLSX file"}
        </p>
        <p className="upload-dropzone-body">
          Tap to browse or drag a file here. The main workflow is designed for one active dataset at a time.
        </p>
        {uploadError && <p className="status-line status-line--error">{uploadError}</p>}
      </div>
    </button>
  );
}
