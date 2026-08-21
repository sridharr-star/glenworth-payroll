# Glenworth Payroll (mock)

A mock, interactive front-end for a new payroll system for **Glenworth Estate Limited**
(Glendale Estate, Coonoor – 643102, The Nilgiris, India), proposed as a replacement for
the retiring **Agiler Payroll** software.

This is a UI mock-up only — no backend, database, or authentication. All data is
in-memory sample data seeded from the master screens and transaction reports exported
from Agiler (Company, Division/Cost Centre, Field, Category, Designation, Grade, Level,
Job Code, Earnings, Deductions, Employee masters; Daily Plucking, Monthly Attendance,
Variable Earnings/Deductions transactions; and a Payslip report).

The layout is intentionally different from Agiler's old Windows-menu-bar style: a
left sidebar with grouped navigation, card-based screens, search + click-to-expand
employee profiles, a dashboard with KPIs and a chart, and a payslip generator.

## Getting started

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Project structure

```
src/
  GlenworthPayroll.jsx   # the app (sidebar, pages, mock data)
  main.jsx               # React entry point
index.html
vite.config.js
package.json
```

## Notes

- The Glendale logo is embedded as a base64 data URI directly in `GlenworthPayroll.jsx`
  so the app has no external image dependencies.
- Sample employee, division, field, and transaction data is drawn from the retiring
  Agiler screens for continuity, but is illustrative — the real roll will be migrated
  separately.
