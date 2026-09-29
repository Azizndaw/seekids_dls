import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import React from "react";
import ErrorBoundary from "./components/ErrorBoundary";

const root = createRoot(document.getElementById("root") as HTMLElement);

// Render the app with SocketProvider as the wrapper
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
