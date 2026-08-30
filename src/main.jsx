import React from "react";
import ReactDOM from "react-dom/client";
import GlenworthPayrollApp from "./GlenworthPayroll.jsx";
import AuthGate from "./AuthGate.jsx";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthGate>
      <GlenworthPayrollApp />
    </AuthGate>
  </React.StrictMode>
);
