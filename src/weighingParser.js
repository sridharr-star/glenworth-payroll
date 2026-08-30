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
// If it turns out to be "round 1 / round 2" of the same weighing point
// instead, only the labels here need to change, not the parsing logic.

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
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
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
      const employeeCode = parts[3].trim();
      const workDate = parseDdmmyy(parts[2].trim());
      const fieldCode1 = parts[6].trim();
      const fieldKg = parseInt(parts[9], 10) || 0;
      const fieldCode2 = parts[12].trim();
      const factoryKg = parseInt(parts[15], 10) || 0;
      const scaleId = parts[28] ? parts[28].trim() : null;
      const status1 = parts[30] ? parts[30].trim() : "";
      const status2 = parts[31] ? parts[31].trim() : "";

      if (!employeeCode) {
        errors.push({ line: idx + 1, reason: "Missing employee code", raw: line });
        return;
      }

      records.push({
        employee_code: employeeCode,
        field_code: fieldCode1 || fieldCode2 || "UNKNOWN",
        terminal,
        work_date: workDate,
        field_kg: fieldKg,
        factory_kg: factoryKg,
        scale_id: scaleId,
        status_flags: [status1, status2].filter(Boolean).join(","),
        raw_line: line,
      });
    } catch (err) {
      errors.push({ line: idx + 1, reason: err.message, raw: line });
    }
  });

  return { records, errors };
}
