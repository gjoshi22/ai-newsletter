import { useState } from "react";
import { api, setToken } from "@/lib/api";

export default function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("admin@xdai.journal");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.login(email, password);
      setToken(result.token);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <form onSubmit={submit} className="admin-card" style={{ width: "min(420px, 100%)", padding: "1.5rem", display: "grid", gap: "0.85rem" }}>
        <div>
          <p style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--neon)" }}>XD AI Journal</p>
          <h1 style={{ margin: "0.35rem 0 0", fontSize: "1.5rem" }}>Editorial Admin</h1>
        </div>
        <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input className="admin-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        {error ? <p style={{ color: "#b42318", fontSize: "0.8rem" }}>{error}</p> : null}
        <button className="admin-btn admin-btn-primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
