// src/ErrorBoundary.jsx
//
// Without this, an uncaught render error on ANY single page (e.g. a null
// value reaching .slice() because of one unexpected row in the database)
// unmounts React's entire tree and blanks the WHOLE app — Dashboard,
// sidebar, everything — not just the broken page. That's what happened
// with the Wage Report Export page's month dropdown.
//
// This wraps each page so a bug in one screen shows an inline error there
// instead of taking down the rest of the app.

import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: "2rem", maxWidth: 700, margin: "0 auto" }}>
          <div
            style={{
              background: "#fff3f3",
              border: "1px solid #f5c2c2",
              borderRadius: 8,
              padding: "1.25rem 1.5rem",
              color: "#a33",
            }}
          >
            <strong>Something went wrong loading this page.</strong>
            <p style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
              {String(this.state.error?.message || this.state.error)}
            </p>
            <p style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#888" }}>
              Other pages in the sidebar should still work — try navigating away and back,
              or reloading the page.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
