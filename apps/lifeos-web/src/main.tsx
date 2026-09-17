import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import "@lifeos/ui/styles.css";
import "@lifeos/shell-ui/styles.css";
import { App } from "./App";
import { startOtaUpdateListener } from "./lib/otaUpdate";
import "./styles.css";

registerSW({ immediate: true });
startOtaUpdateListener();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
