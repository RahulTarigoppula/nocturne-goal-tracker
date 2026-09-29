import { Capacitor } from "@capacitor/core";
import { createRoot } from "react-dom/client";
import "../styles/tokens.css";
import "../styles/app.css";
import { App } from "./router";

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);

// Service worker on the web only; the Android build has no SW (the PWA plugin is not even compiled in).
if (!Capacitor.isNativePlatform() && import.meta.env.PROD && "serviceWorker" in navigator) {
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const update = registerSW({
        onNeedRefresh: () => window.dispatchEvent(new CustomEvent("nocturne:update", { detail: update })),
      });
    })
    .catch(() => {});
}
