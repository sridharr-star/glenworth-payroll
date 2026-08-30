// src/AuthGate.jsx
//
// Wraps the whole app: shows a login screen until someone signs in with
// Supabase Auth (email + password), then renders the actual app.
// Uses a single shared login for now (one email/password for the whole
// Glendale office during testing) — individual per-staff logins can be
// added later without changing this file's structure.

import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading, null = signed out
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) setError(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // Still checking for an existing session
  if (session === undefined) {
    return (
      <div style={styles.centerScreen}>
        <div style={{ color: "#8C8264", fontFamily: "'Inter', sans-serif" }}>Loading…</div>
      </div>
    );
  }

  // Not signed in — show login form
  if (!session) {
    return (
      <div style={styles.centerScreen}>
        <form onSubmit={handleLogin} style={styles.card}>
          <h1 style={styles.title}>Glenworth Payroll</h1>
          <p style={styles.subtitle}>Glendale Estate office access</p>

          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            placeholder="office@glenworthestate.com"
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            placeholder="••••••••"
          />

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={signingIn} style={styles.button}>
            {signingIn ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    );
  }

  // Signed in — show the app, plus a small sign-out control
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {children}
      <button onClick={handleSignOut} style={styles.signOutBtn} title="Sign out">
        Sign Out
      </button>
    </div>
  );
}

const styles = {
  centerScreen: {
    height: "100vh",
    width: "100vw",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#F7F3E4",
    fontFamily: "'Inter', sans-serif",
  },
  card: {
    background: "#FFFFFF",
    border: "1px solid #E6DFCB",
    borderRadius: 12,
    padding: "32px 30px",
    width: 340,
    boxShadow: "0 4px 16px rgba(41,33,15,0.08)",
    display: "flex",
    flexDirection: "column",
  },
  title: {
    fontFamily: "'Fraunces', serif",
    fontSize: 22,
    fontWeight: 600,
    color: "#26332C",
    margin: 0,
  },
  subtitle: {
    fontSize: 13,
    color: "#8C8264",
    margin: "4px 0 20px",
  },
  label: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#7C7259",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  input: {
    padding: "9px 12px",
    borderRadius: 7,
    border: "1px solid #DED4B4",
    fontSize: 14,
    marginBottom: 16,
    outline: "none",
    fontFamily: "'Inter', sans-serif",
  },
  error: {
    background: "#F3E0DD",
    color: "#8A2E24",
    fontSize: 12.5,
    padding: "8px 10px",
    borderRadius: 6,
    marginBottom: 14,
  },
  button: {
    background: "#2F4A3C",
    color: "#FBF6E4",
    border: "none",
    borderRadius: 7,
    padding: "10px 0",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
  signOutBtn: {
    position: "fixed",
    bottom: 16,
    right: 16,
    background: "#2F4A3C",
    color: "#FBF6E4",
    border: "none",
    borderRadius: 20,
    padding: "8px 16px",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    zIndex: 100,
  },
};
