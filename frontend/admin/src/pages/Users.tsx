import { useEffect, useState } from "react";
import type { UserRole } from "@workspace/content";
import { api, type AuthUser } from "@/lib/api";

type ManagedUser = AuthUser & { active: boolean; createdAt: string };

export default function Users() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [error, setError] = useState("");

  const load = () => {
    api.listUsers()
      .then((result) => setUsers(result.users))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users"));
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await api.createUser({ email, name, password, role });
      setEmail("");
      setName("");
      setPassword("");
      setRole("editor");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "1.4rem" }}>Users</h1>
        <p style={{ margin: "0.35rem 0 0", opacity: 0.7 }}>Superadmins can invite editors who can create articles.</p>
      </div>

      <form onSubmit={create} className="admin-card" style={{ padding: "1rem", display: "grid", gap: "0.75rem", maxWidth: "520px" }}>
        <h2 style={{ margin: 0, fontSize: "0.9rem" }}>Invite editor</h2>
        <input className="admin-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required />
        <input className="admin-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <input className="admin-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Temporary password" required />
        <select className="admin-select" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
          <option value="editor">Editor</option>
          <option value="superadmin">Superadmin</option>
        </select>
        <button className="admin-btn admin-btn-primary" type="submit">Create user</button>
      </form>

      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}

      <div className="admin-card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid hsl(var(--border))", textAlign: "left" }}>
              <th style={{ padding: "0.85rem" }}>Name</th>
              <th style={{ padding: "0.85rem" }}>Email</th>
              <th style={{ padding: "0.85rem" }}>Role</th>
              <th style={{ padding: "0.85rem" }}>Active</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid hsl(var(--border))" }}>
                <td style={{ padding: "0.85rem" }}>{user.name}</td>
                <td style={{ padding: "0.85rem" }}>{user.email}</td>
                <td style={{ padding: "0.85rem" }}>{user.role}</td>
                <td style={{ padding: "0.85rem" }}>{user.active ? "yes" : "no"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
