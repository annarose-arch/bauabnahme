import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import "./index.css";
import App from "./App.jsx";

Sentry.init({
  dsn: "https://7513ed5b2e71b5921c729ae6d9700410@o4511118079492096.ingest.de.sentry.io/4511118096662608",
  tracesSampleRate: 1.0,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
// cache bust Mon Mar 30 08:29:53 CEST 2026
// Mon Mar 30 12:58:57 CEST 2026
// force Mon Mar 30 15:45:03 CEST 2026
