import { useCallback, useMemo, useState } from "react";
import { ToastContext } from "./toastContext";

let toastId = 0;

const TONE_CLASS = {
  success: "bg-emerald-700 border-emerald-500/40",
  error: "bg-rose-800 border-rose-500/40",
  warning: "bg-amber-800 border-amber-500/40",
  info: "bg-slate-800 border-cyan-500/40",
};

export default function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone, message, { durationMs = 4200 } = {}) => {
      if (!message) return;
      const id = ++toastId;
      setItems((prev) => [...prev.slice(-4), { id, tone, message }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({
      success: (message, opts) => push("success", message, opts),
      error: (message, opts) => push("error", message, opts),
      warning: (message, opts) => push("warning", message, opts),
      info: (message, opts) => push("info", message, opts),
      dismiss,
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        dir="rtl"
        className="fixed bottom-4 inset-x-0 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md w-full rounded-xl border px-4 py-3 text-sm text-white shadow-lg ${TONE_CLASS[t.tone] || TONE_CLASS.info}`}
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
