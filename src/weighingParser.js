// src/weighingParser.js  (v2 — fixes the 2-of-4 session weight bug)
//
// Parses the fixed-format .TXT export from the leaf weighing terminals.
//
// Example line (real file, confirmed against 94 files + client's Excel
// template this session):
// 1,1 ,010826,4650,P,      ,5     , . , ,065,0000,00,5     , . , ,061,0000,00,      , . , ,000,0000,00,      , . , ,000,0017,00,S,S, ,
//
// Field positions (0-indexed after splitting on ','):
//   0  Team
//   1  Division
//   2  Date as DDMMYY (e.g. 010826 = 01-Aug-2026)
//   3  Employee code
//   4  Status ('P' = present, blank = absent)
//   5  Job code (blank = plucking)
//   9  Session 1 weight (kg)
//  15  Session 2 weight (kg)
//  21  Session 3 weight (kg)
//  27  Session 4 weight (kg)
//  28  Scale/terminal id (constant per file)
//  30  Status flag — 1st weighing ('S' = accepted)
//  31  Status flag — 2nd weighing
//
// IMPORTANT: the previous version of this file only read indices 9 and 15
// (calling them "Field kg" / "Factory kg") and silently dropped sessions 3
// and 4 (indices 21/27) entirely — undercounting roughly half of each
// employee's daily plucking weight for anyone with more than 2 weighing
// sessions. This version reads all 4.

/**
 * Strip null bytes and other non-printable control characters that some
 * export tools leave behind (Postgres text columns reject \u0000 outright).
 */
function sanitize(str) {
  if (str == null) return str;
  // eslint-disable-next-line no-control-regex
  return String(str).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
}

/**
 * Extract the terminal code (A1, A2, A3, A4, ...) from a filename like
 * "20260825.A3.TXT". Falls back to the older "I<n>" convention if present.
 */
export function extractTerminalFromFilename(filename) {
  let match = filename.match(/\.A(\d+)\./i);
  if (match) return `A${match[1]}`;
  match = filename.match(/I(\d+)/i);
  return match ? `I${match[1]}` : "UNKNOWN";
}

/**
 * Extract the file date (YYYY-MM-DD) from a filename like "20260825.A3.TXT".
 * This is treated as the authoritative date — see internal-date-mismatch
 * handling below — matching the convention confirmed this session.
 */
export function extractFileDateFromFilename(filename) {
  const match = filename.match(/(\d{4})(\d{2})(\d{2})\.A\d+\./i);
  if (!match) return null;
  const [, yyyy, mm, dd] = match;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse a DDMMYY date string (e.g. "010826") into an ISO date "2026-08-01".
 * Assumes 21st century (20YY).
 */
function parseDdmmyy(raw) {
  const dd = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const yy = raw.slice(4, 6);
  const yyyy = 2000 + parseInt(yy, 10);
  return `${yyyy}-${mm}-${dd}`;
}

function toDdmmyy(isoDate) {
  // "2026-08-01" -> "010826"
  const [yyyy, mm, dd] = isoDate.split("-");
  return `${dd}${mm}${yyyy.slice(2)}`;
}

/**
 * Parse the full text content of one weighing terminal file.
 * @param {string} text - raw file content
 * @param {string} terminal - terminal code, e.g. 'A1' (from filename)
 * @param {string} filename - original filename (used for the authoritative file date)
 * @returns {Array<object>} parsed records ready to upsert into `daily_weighing`
 */
export function parseWeighingFile(text, terminal, filename) {
  const cleanText = sanitize(text.replace(/\u0000/g, ""));

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => sanitize(l))
    .filter((l) => l.length > 0);

  const fileDate = extractFileDateFromFilename(filename || "");
  const expectedInternal = fileDate ? toDdmmyy(fileDate) : null;

  const records = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const parts = line.split(",");

    if (parts.length < 29) {
      errors.push({ line: idx + 1, reason: "Unexpected column count", raw: line });
      return;
    }

    try {
      const division = sanitize(parts[1]);
      const internalDate = sanitize(parts[2]);
      const employeeCode = sanitize(parts[3]);
      const status = sanitize(parts[4]);
      const jobCode = sanitize(parts[5]);

      const session1Kg = parseInt(parts[9], 10) || 0;
      const session2Kg = parseInt(parts[15], 10) || 0;
      const session3Kg = parseInt(parts[21], 10) || 0;
      const session4Kg = parseInt(parts[27], 10) || 0;

      if (!employeeCode) {
        errors.push({ line: idx + 1, reason: "Missing employee code", raw: line });
        return;
      }

      records.push({
        employee_code: employeeCode,
        division,
        job_code: jobCode || null,
        status,
        terminal: sanitize(terminal),
        file_date: fileDate,
        internal_date: internalDate,
        session1_kg: session1Kg,
        session2_kg: session2Kg,
        session3_kg: session3Kg,
        session4_kg: session4Kg,
        raw_line: sanitize(line),
      });

      if (idx === 0 && expectedInternal && internalDate !== expectedInternal) {
        errors.push({
          line: idx + 1,
          reason: `Date mismatch: filename says ${expectedInternal}, row says ${internalDate} (flagged, not fatal)`,
          raw: line,
          warning: true,
        });
      }
    } catch (err) {
      errors.push({ line: idx + 1, reason: err.message, raw: line });
    }
  });

  return { records, errors, fileDate };
}
