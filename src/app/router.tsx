import { Component, lazy, type ReactNode, Suspense } from "react";
import { createHashRouter, Outlet, useNavigate } from "react-router";
import { FrontPage } from "../features/front-page/FrontPage";
import { Providers } from "./providers";
import { Shell } from "./Shell";

class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page">
        <div className="page-head rh">
          <span>Nocturne</span>
        </div>
        <p className="light-line">This page could not be set.</p>
        <button type="button" className="btn-text" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

function Root() {
  const navigate = useNavigate();
  return (
    <Providers navigate={(hash) => navigate(hash.replace(/^#/, ""))}>
      <Outlet />
    </Providers>
  );
}

// The Front Page ships in the first chunk; every other surface is a lazy chunk.
const WeekSpread = lazy(() => import("../features/week-spread/WeekSpread").then((m) => ({ default: m.WeekSpread })));
const Ledger = lazy(() => import("../features/ledger/Ledger").then((m) => ({ default: m.Ledger })));
const BackIssues = lazy(() => import("../features/back-issues/BackIssues").then((m) => ({ default: m.BackIssues })));
const FrozenIssue = lazy(() => import("../features/back-issues/FrozenIssue").then((m) => ({ default: m.FrozenIssue })));
const ColophonPage = lazy(() => import("../features/colophon/ColophonPage").then((m) => ({ default: m.ColophonPage })));

const wrap = (el: ReactNode) => (
  <RouteBoundary>
    <Suspense fallback={<div className="page" aria-busy="true" />}>{el}</Suspense>
  </RouteBoundary>
);

export const router = createHashRouter([
  {
    element: <Root />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: "/", element: wrap(<FrontPage />) },
          { path: "/upcoming", element: wrap(<WeekSpread />) },
          { path: "/ledger", element: wrap(<Ledger />) },
          { path: "/issues", element: wrap(<BackIssues />) },
          { path: "/issues/:dayKey", element: wrap(<FrozenIssue />) },
          { path: "/colophon", element: wrap(<ColophonPage />) },
          { path: "*", element: wrap(<FrontPage />) },
        ],
      },
    ],
  },
]);
