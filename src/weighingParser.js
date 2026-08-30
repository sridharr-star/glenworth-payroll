// src/weighingParser.js
//
// Parses the fixed-format .TXT export from the leaf weighing terminals.
//
// Example line:
// G,02,250826,1088,P,      ,7     , . , ,025,0000,00,7     , . , ,029,0000,00,,.,,000,0000,00,,.,,000,0017,00,S,S,,
//
// Field positions (0-indexed after splitting on ','):
//   0  record type (G/A)
//   1  division code
//   2  date as DDMMYY (e.g. 250826 = 25-Aug-2026)
//   3  employee code
//   6  field code — 1st weighing (e.g. '7', '9', 'LA1B')
//   9  weight (kg) — 1st weighing   ← assumed "Field" weight
//   12 field code — 2nd weighing (usually same as position 6)
//   15 weight (kg) — 2nd weighing  ← assumed "Factory" weight
//   28 scale/terminal id (constant per file, e.g. '0017')
//   30 status flag — 1st weighing ('S' = accepted)
//   31 status flag — 2nd weighing ('S' = accepted, blank = not recorded)
//
// NOTE: the Field-vs-Factory interpretation of the two weight columns is an
// assumption pending confirmation from field staff — see chat notes.

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
 * Extract the terminal code (I1, I2, I3, ...) from a filename like
 * "2026.08.25.I3 (1).TXT"
 */
export function extractTerminalFromFilename(filename) {
  const match = filename.match(/I(\d+)/i);
  return match ? `I${match[1]}` : "UNKNOWN";
}

/**
 * Parse a DDMMYY date string (e.g. "250826") into an ISO date "2026-08-25".
 * Assumes 21st century (20YY).
 */
function parseDdmmyy(raw) {
  const dd = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const yy = raw.slice(4, 6);
  const yyyy = 2000 + parseInt(yy, 10);
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Parse the full text content of one weighing terminal file.
 * @param {string} text - raw file content
 * @param {string} terminal - terminal code, e.g. 'I1' (usually from filename)
 * @returns {Array<object>} parsed records ready to upsert into `daily_weighing`
 */
export function parseWeighingFile(text, terminal) {
  // Strip null bytes from the whole file up front (covers stray bytes
  // that don't land inside a clean field, e.g. trailing padding at EOF).
  const cleanText = sanitize(text.replace(/\u0000/g, ""));

  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => sanitize(l))
    .filter((l) => l.length > 0);

  const records = [];
  const errors = [];

  lines.forEach((line, idx) => {
    const parts = line.split(",");

    if (parts.length < 31) {
      errors.push({ line: idx + 1, reason: "Unexpected column count", raw: line });
      return;
    }

    try {
      const employeeCode = sanitize(parts[3]);
      const workDate = parseDdmmyy(sanitize(parts[2]));
      const fieldCode1 = sanitize(parts[6]);
      const fieldKg = parseInt(parts[9], 10) || 0;
      const fieldCode2 = sanitize(parts[12]);
      const factoryKg = parseInt(parts[15], 10) || 0;
      const scaleId = parts[28] ? sanitize(parts[28]) : null;
      const status1 = parts[30] ? sanitize(parts[30]) : "";
      const status2 = parts[31] ? sanitize(parts[31]) : "";

      if (!employeeCode) {
        errors.push({ line: idx + 1, reason: "Missing employee code", raw: line });
        return;
      }

      records.push({
        employee_code: employeeCode,
        field_code: fieldCode1 || fieldCode2 || "UNKNOWN",
        terminal: sanitize(terminal),
        work_date: workDate,
        field_kg: fieldKg,
        factory_kg: factoryKg,
        scale_id: scaleId,
        status_flags: [status1, status2].filter(Boolean).join(","),
        raw_line: sanitize(line),
      });
    } catch (err) {
      errors.push({ line: idx + 1, reason: err.message, raw: line });
    }
  });

  return { records, errors };
}
