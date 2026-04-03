"use client";

import React, { useRef, useState } from "react";
import SystemIcon from "@/components/SystemIcon";

interface Props {
  onFile: (file: File) => void;
  isLoading: boolean;
}

export default function UploadPanel({ onFile, isLoading }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension === "csv" || extension === "xlsx" || extension === "xls") {
      onFile(file);
    }
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
        accept=".csv,.xlsx,.xls"
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
          {isLoading ? "Analyzing dataset…" : "Drop a CSV or Excel file"}
        </p>
        <p className="upload-dropzone-body">
          Tap to browse or drag a file here. The main workflow is designed for one active dataset at a time.
        </p>
      </div>
    </button>
  );
}
