import { Component, type ReactNode } from "react";
import { createHashRouter, Outlet, useNavigate } from "react-router";
import { BackIssues } from "../features/back-issues/BackIssues";
import { FrozenIssue } from "../features/back-issues/FrozenIssue";
import { ColophonPage } from "../features/colophon/ColophonPage";
import { FrontPage } from "../features/front-page/FrontPage";
import { Ledger } from "../features/ledger/Ledger";
import { WeekSpread } from "../features/week-spread/WeekSpread";
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

const wrap = (el: ReactNode) => <RouteBoundary>{el}</RouteBoundary>;

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
