import {
  type AnchorHTMLAttributes,
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * A ~100-line hash router for six fixed routes. Replaces React Router (≈30 KB gzip) so the
 * initial bundle meets its budget. URLs keep the same shape: /nocturne/#/issues/2026-09-05?entry=x
 */

interface Loc {
  pathname: string;
  search: string;
}

function read(): Loc {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const q = raw.indexOf("?");
  const pathname = (q < 0 ? raw : raw.slice(0, q)) || "/";
  return { pathname: pathname.startsWith("/") ? pathname : `/${pathname}`, search: q < 0 ? "" : raw.slice(q) };
}

const LocCtx = createContext<Loc>({ pathname: "/", search: "" });
const ParamsCtx = createContext<Record<string, string>>({});

export function HashRouter({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener("hashchange", on);
    window.addEventListener("popstate", on);
    return () => {
      window.removeEventListener("hashchange", on);
      window.removeEventListener("popstate", on);
    };
  }, []);
  return <LocCtx.Provider value={loc}>{children}</LocCtx.Provider>;
}

export const useLocation = (): Loc => useContext(LocCtx);
export const useParams = (): Record<string, string | undefined> => useContext(ParamsCtx);

export function navigateTo(to: string, opts: { replace?: boolean } = {}): void {
  const hash = `#${to.startsWith("/") ? to : `/${to}`}`;
  if (opts.replace) {
    history.replaceState(history.state, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else window.location.hash = hash;
}

export function useNavigate(): (to: string, opts?: { replace?: boolean }) => void {
  return useCallback((to, opts) => navigateTo(to, opts), []);
}

export function useSearchParams(): [
  URLSearchParams,
  (next: Record<string, string>, opts?: { replace?: boolean }) => void,
] {
  const { pathname, search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const set = useCallback(
    (next: Record<string, string>, opts?: { replace?: boolean }) => {
      const q = new URLSearchParams(next).toString();
      navigateTo(`${pathname}${q ? `?${q}` : ""}`, opts);
    },
    [pathname],
  );
  return [params, set];
}

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & { to: string };

export function Link({ to, ...rest }: LinkProps) {
  return <a href={`#${to}`} {...rest} />;
}

export function NavLink({ to, end, ...rest }: LinkProps & { end?: boolean }) {
  const { pathname } = useLocation();
  const active = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  return <Link to={to} aria-current={active ? "page" : undefined} {...rest} />;
}

export interface Route {
  path: string;
  element: ReactNode;
}

function match(pattern: string, pathname: string): Record<string, string> | null {
  if (pattern === "*") return {};
  const a = pattern.split("/").filter(Boolean);
  const b = pathname.split("/").filter(Boolean);
  if (a.length !== b.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < a.length; i++) {
    const p = a[i] as string;
    const v = b[i] as string;
    if (p.startsWith(":")) params[p.slice(1)] = decodeURIComponent(v);
    else if (p !== v) return null;
  }
  return params;
}

/** Render the first route whose pattern matches the current hash path. */
export function Routes({ routes }: { routes: Route[] }) {
  const { pathname } = useLocation();
  for (const r of routes) {
    const params = match(r.path, pathname);
    if (params) return <ParamsCtx.Provider value={params}>{r.element}</ParamsCtx.Provider>;
  }
  return null;
}
