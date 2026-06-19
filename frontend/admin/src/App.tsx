import { useEffect, useState } from "react";
import { Route, Switch, useLocation } from "wouter";
import { AdminNavLink } from "@/components/AdminNavLink";
import { api, clearToken, getToken, type AuthUser } from "@/lib/api";
import ArticleEditor from "@/pages/ArticleEditor";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Users from "@/pages/Users";

function Shell({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <p className="admin-brand">XD AI Journal</p>
        <p className="admin-user-name">{user.name}</p>
        <nav className="admin-nav">
          <AdminNavLink href="/" activePaths={["/", "/articles"]}>Stories</AdminNavLink>
          {user.role === "superadmin" ? <AdminNavLink href="/users">Users</AdminNavLink> : null}
        </nav>
        <button type="button" className="admin-btn admin-sidebar-signout" onClick={onLogout}>
          Sign out
        </button>
      </aside>
      <main className="admin-main">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/articles/new" component={ArticleEditor} />
          <Route path="/articles/:id" component={ArticleEditor} />
          <Route path="/users" component={Users} />
        </Switch>
      </main>
    </div>
  );
}

export default function App() {
  const [, navigate] = useLocation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.me()
      .then((result) => setUser(result.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>Loading admin...</div>;
  }

  if (!user) {
    return (
      <Login
        onSuccess={() => {
          api.me().then((result) => {
            setUser(result.user);
            navigate("/");
          });
        }}
      />
    );
  }

  return (
    <Shell
      user={user}
      onLogout={() => {
        clearToken();
        setUser(null);
      }}
    />
  );
}
