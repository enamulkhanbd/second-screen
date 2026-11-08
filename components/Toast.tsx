"use client";

import React from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const toasts = useTokenStore((s) => s.toasts);
  const removeToast = useTokenStore((s) => s.removeToast);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[calc(100vw-2.5rem)] max-w-[560px] flex-col gap-3"
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            role={isError ? "alert" : "status"}
            className="pointer-events-auto flex items-start gap-4 rounded-2xl border border-border bg-background p-5 text-foreground shadow-lg transition duration-300 animate-in slide-in-from-bottom-5"
          >
            <div className="mt-0.5 shrink-0" aria-hidden="true">
              {isSuccess ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              ) : isError ? (
                <AlertCircle className="h-6 w-6 text-destructive" />
              ) : (
                <Info className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-semibold leading-6">{toast.title}</h4>
              {toast.message && (
                <p className="mt-1 break-words text-sm leading-5 text-muted-foreground">
                  {toast.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label={`Dismiss ${toast.title} notification`}
              className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
