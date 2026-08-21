import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base path matches the GitHub repo name so assets resolve correctly
// when served from https://sridharr-star.github.io/glenworth-payroll/
export default defineConfig({
  plugins: [react()],
  base: "/glenworth-payroll/",
});
