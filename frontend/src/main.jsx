import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/opsPanels.css";
import App from "./App.jsx";
import { AuthProvider } from "./services/authContext.jsx";
import ToastProvider from "./components/feedback/ToastProvider.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </StrictMode>,
);
