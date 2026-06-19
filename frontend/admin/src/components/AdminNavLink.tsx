import { Link, useLocation } from "wouter";

type AdminNavLinkProps = {
  href: string;
  activePaths?: string[];
  children: string;
};

function isActivePath(location: string, path: string) {
  if (path === "/") return location === "/";
  return location === path || location.startsWith(`${path}/`);
}

export function AdminNavLink({ href, activePaths, children }: AdminNavLinkProps) {
  const [location] = useLocation();
  const paths = activePaths ?? [href];
  const active = paths.some((path) => isActivePath(location, path));

  return (
    <Link href={href} className={active ? "admin-nav-link is-active" : "admin-nav-link"}>
      {children}
    </Link>
  );
}
