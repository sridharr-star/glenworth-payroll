// src/DailyWeighingUpload.jsx
//
// Lets office staff upload one or more weighing-terminal .TXT files,
// previews the parsed data, and imports it into Supabase (daily_weighing table).

import { useState } from "react";
import { supabase } from "./supabaseClient";
import { parseWeighingFile, extractTerminalFromFilename } from "./weighingParser";

export default function DailyWeighingUpload() {
  const [preview, setPreview] = useState([]); // combined records from all selected files
  const [errors, setErrors] = useState([]);
  const [fileNames, setFileNames] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null); // { inserted, failed } after import

  async function handleFiles(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setResult(null);
    const allRecords = [];
    const allErrors = [];
    const names = [];

    for (const file of files) {
      const text = await file.text();
      const terminal = extractTerminalFromFilename(file.name);
      const { records, errors: fileErrors } = parseWeighingFile(text, terminal);
      allRecords.push(...records);
      allErrors.push(
        ...fileErrors.map((err) => ({ ...err, file: file.name }))
      );
      names.push(`${file.name} (terminal ${terminal})`);
    }

    setPreview(allRecords);
    setErrors(allErrors);
    setFileNames(names);
  }

  async function handleImport() {
    if (preview.length === 0) return;
    setUploading(true);
    setResult(null);

    // Supabase upsert in batches of 500 (safe batch size)
    const batchSize = 500;
    let inserted = 0;
    let failed = 0;

    for (let i = 0; i < preview.length; i += batchSize) {
      const batch = preview.slice(i, i + batchSize);
      const { error } = await supabase
        .from("daily_weighing")
        .upsert(batch, {
          onConflict: "employee_code,field_code,terminal,work_date",
        });

      if (error) {
        console.error("Import batch failed:", error);
        failed += batch.length;
      } else {
        inserted += batch.length;
      }
    }

    setUploading(false);
    setResult({ inserted, failed });
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 900, margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Daily Weighing Upload</h2>
      <p style={{ color: "#666", marginBottom: "1rem" }}>
        Select one or more weighing terminal export files (.TXT) — e.g. one per
        field/terminal for the same day.
      </p>

      <input
        type="file"
        accept=".txt,.TXT"
        multiple
        onChange={handleFiles}
        style={{ marginBottom: "1rem" }}
      />

      {fileNames.length > 0 && (
        <div style={{ marginBottom: "1rem", fontSize: "0.9rem", color: "#444" }}>
          <strong>Selected:</strong> {fileNames.join(", ")}
        </div>
      )}

      {errors.length > 0 && (
        <div
          style={{
            background: "#fff3f3",
            border: "1px solid #f5c2c2",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            color: "#a33",
          }}
        >
          <strong>{errors.length} line(s) could not be parsed:</strong>
          <ul style={{ marginTop: "0.5rem", maxHeight: 120, overflowY: "auto" }}>
            {errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                {err.file} — line {err.line}: {err.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {preview.length > 0 && (
        <>
          <h3 style={{ marginBottom: "0.5rem" }}>
            Preview — {preview.length} record(s) parsed
          </h3>
          <div style={{ maxHeight: 320, overflowY: "auto", marginBottom: "1rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "#f5f5f5", textAlign: "left" }}>
                  <th style={cellStyle}>Employee</th>
                  <th style={cellStyle}>Field</th>
                  <th style={cellStyle}>Terminal</th>
                  <th style={cellStyle}>Date</th>
                  <th style={cellStyle}>Field kg</th>
                  <th style={cellStyle}>Factory kg</th>
                  <th style={cellStyle}>Diff</th>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 100).map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={cellStyle}>{r.employee_code}</td>
                    <td style={cellStyle}>{r.field_code}</td>
                    <td style={cellStyle}>{r.terminal}</td>
                    <td style={cellStyle}>{r.work_date}</td>
                    <td style={cellStyle}>{r.field_kg}</td>
                    <td style={cellStyle}>{r.factory_kg}</td>
                    <td style={cellStyle}>{r.field_kg - r.factory_kg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 100 && (
              <p style={{ color: "#888", fontSize: "0.85rem" }}>
                Showing first 100 of {preview.length} records.
              </p>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={uploading}
            style={{
              padding: "0.6rem 1.2rem",
              background: uploading ? "#aaa" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Importing..." : `Import ${preview.length} record(s) to database`}
          </button>
        </>
      )}

      {result && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: result.failed > 0 ? "#fff3f3" : "#f0fdf4",
            color: result.failed > 0 ? "#a33" : "#166534",
          }}
        >
          Imported {result.inserted} record(s).{" "}
          {result.failed > 0 && `${result.failed} failed — check console for details.`}
        </div>
      )}
    </div>
  );
}

const cellStyle = { padding: "0.4rem 0.6rem", border: "1px solid #eee" };
