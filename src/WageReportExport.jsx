// src/WageReportExport.jsx
//
// "For the time being" Excel export: pulls the already-computed wage data
// straight from the Supabase views (daily_wages_computed,
// monthly_pms_settlement) and downloads it as a 2-sheet .xlsx, in the same
// shape as the Daily Detail / Monthly Summary workbook built earlier this
// session — but live off whatever's actually in the database right now.
//
// NOTE: uses the `xlsx` (SheetJS) npm package for writing only (never
// parsing an uploaded file), which keeps it well clear of that package's
// known parsing-side vulnerabilities (prototype pollution / ReDoS on
// malicious input) — there's no untrusted file ever handed to it here.

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "./supabaseClient";

const PAGE_SIZE = 1000;

async function fetchAll(table, monthFilter) {
  let all = [];
  let from = 0;
  while (true) {
    let query = supabase.from(table).select("*").range(from, from + PAGE_SIZE - 1);
    if (monthFilter) {
      if (table === "daily_wages_computed") {
        query = query
          .gte("file_date", `${monthFilter}-01`)
          .lt("file_date", nextMonth(monthFilter));
      } else {
        query = query.eq("month", `${monthFilter}-01`);
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    all = all.concat(data || []);
    if (!data || data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

function nextMonth(yyyyMm) {
  const [y, m] = yyyyMm.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export default function WageReportExport() {
  const [months, setMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    async function loadMonths() {
      const { data, error } = await supabase
        .from("monthly_pms_settlement")
        .select("month")
        .not("month", "is", null)
        .order("month", { ascending: false });
      if (!error && data) {
        // Filter out null/undefined defensively even though the query above
        // already excludes them — a null `month` happens when a
        // daily_weighing row has a null file_date (e.g. a file whose name
        // didn't match the expected YYYYMMDD.A<n>.TXT pattern), and without
        // this guard a single bad row crashes the whole page (and, with no
        // error boundary anywhere in the app, the whole app) via .slice()
        // on null in the dropdown below.
        const unique = [...new Set(data.map((r) => r.month).filter(Boolean))];
        setMonths(unique);
      }
    }
    loadMonths();
  }, []);

  async function handleExport() {
    setExporting(true);
    setStatus(null);
    try {
      const monthFilter = selectedMonth || null;
      const [dailyRows, monthlyRows] = await Promise.all([
        fetchAll("daily_wages_computed", monthFilter),
        fetchAll("monthly_pms_settlement", monthFilter),
      ]);

      if (dailyRows.length === 0) {
        setStatus({ ok: false, message: "No weighing data found for that month yet." });
        setExporting(false);
        return;
      }

      const dailySheet = XLSX.utils.json_to_sheet(
        dailyRows.map((r) => ({
          "File Date": r.file_date,
          "Employee Code": r.employee_code,
          "Employee Name": r.employee_name,
          Terminal: r.terminal,
          Division: r.division,
          "Job Code": r.job_code,
          "Session 1 Kg": r.session1_kg,
          "Session 2 Kg": r.session2_kg,
          "Session 3 Kg": r.session3_kg,
          "Session 4 Kg": r.session4_kg,
          "Total Kg": r.total_kg,
          "Wages Process": r.wages_process,
          "Daily Basic": r.daily_basic,
          "Daily Personal Pay": r.daily_personal_pay,
          "Variable DA": r.variable_da,
          Wages: r.wages,
          "Job Diff Amt": r.job_diff_amt,
          "NPA Paid Today": r.npa_total_paid_today,
          "Date Mismatch?": r.date_mismatch ? "MISMATCH" : "",
        }))
      );

      const monthlySheet = XLSX.utils.json_to_sheet(
        monthlyRows.map((r) => ({
          "Employee Code": r.employee_code,
          "Employee Name": r.employee_name,
          Month: r.month,
          "Wages Process": r.wages_process,
          "Days Worked": r.days_worked,
          "Total Plucking Kg (month)": r.total_plucking_kg_month,
          "NPA Paid (month sum)": r.npa_paid_month_sum,
          "PMS Payable at Month-End": r.pms_payable_month_end,
        }))
      );

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, dailySheet, "Daily Detail");
      XLSX.utils.book_append_sheet(wb, monthlySheet, "Monthly Summary");

      const label = selectedMonth || "AllData";
      XLSX.writeFile(wb, `Glenworth_Wage_Report_${label}.xlsx`);

      setStatus({
        ok: true,
        message: `Exported ${dailyRows.length} daily record(s) and ${monthlyRows.length} employee-month summary row(s).`,
      });
    } catch (err) {
      console.error(err);
      setStatus({ ok: false, message: `Export failed: ${err.message}` });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ padding: "1.5rem", maxWidth: 700, margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Wage Report Export</h2>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Pulls whatever's currently in the database (uploaded via Daily Weighing
        Upload) and downloads it as an Excel workbook — Daily Detail (with NPA,
        paid per day) and Monthly Summary (with PMS, settled once at month-end).
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.9rem", color: "#444" }}>
          Month
        </label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          style={{ padding: "0.5rem", borderRadius: 6, border: "1px solid #ccc", minWidth: 220 }}
        >
          <option value="">All months</option>
          {months.filter(Boolean).map((m) => (
            <option key={m} value={m.slice(0, 7)}>
              {new Date(m).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleExport}
        disabled={exporting}
        style={{
          padding: "0.6rem 1.2rem",
          background: exporting ? "#aaa" : "#2563eb",
          color: "white",
          border: "none",
          borderRadius: 6,
          cursor: exporting ? "not-allowed" : "pointer",
        }}
      >
        {exporting ? "Exporting..." : "Export to Excel"}
      </button>

      {status && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            borderRadius: 8,
            background: status.ok ? "#f0fdf4" : "#fff3f3",
            color: status.ok ? "#166534" : "#a33",
          }}
        >
          {status.message}
        </div>
      )}
    </div>
  );
}
