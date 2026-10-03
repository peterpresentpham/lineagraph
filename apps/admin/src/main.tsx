import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@lineagraph/ui/src/tokens.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
