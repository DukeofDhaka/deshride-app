import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, HashRouter } from "react-router-dom";
import App from "./App";
import { TranslationProvider } from "./i18n";
import "./styles.css";
import { startSync } from "./lib/backend/sync";

// VITE_ARTIFACT builds run from a single self-contained HTML file where the
// URL path is not ours to control, so history-based routing cannot work there.
const useHashRouter = Boolean(import.meta.env.VITE_ARTIFACT);

// With a backend configured, wait briefly for the first sync so the first
// screen shows shared rides; never block the app for more than 4 seconds.
const firstSync = Promise.race([startSync().catch(() => undefined), new Promise((r) => setTimeout(r, 4000))]);

firstSync.then(() => ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <TranslationProvider>
      {useHashRouter ? (
        <HashRouter>
          <App />
        </HashRouter>
      ) : (
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <App />
        </BrowserRouter>
      )}
    </TranslationProvider>
  </React.StrictMode>
));
