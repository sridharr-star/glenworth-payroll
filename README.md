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

## Live demo

Once pushed to GitHub with Pages enabled (see below), the app is served at:

**https://sridharr-star.github.io/glenworth-payroll/**

## Getting started (local)

```bash
npm install
npm run dev
```

Then open the printed local URL (typically `http://localhost:5173`).

This is a Vite/React project — `index.html` cannot be opened directly as a file
(`file://…`) or viewed as source on github.com; it must be run through the Vite
dev server (above) or built and served (below).

## Build

```bash
npm run build
npm run preview
```

## Deploying to GitHub Pages

A workflow at `.github/workflows/deploy.yml` builds and deploys the app
automatically on every push to `main`. One-time setup after pushing:

1. On GitHub, go to the repo's **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Push to `main` (or re-run the workflow from the **Actions** tab).
4. After the workflow finishes, the app is live at
   `https://sridharr-star.github.io/glenworth-payroll/`.

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
