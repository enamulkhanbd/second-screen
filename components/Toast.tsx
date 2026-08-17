"use client";

import React from "react";
import { useTokenStore } from "@/store/useTokenStore";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useTokenStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === "success";
        const isError = toast.type === "error";

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              isSuccess
                ? "bg-emerald-950/90 border-emerald-500/30 text-emerald-100"
                : isError
                ? "bg-rose-950/90 border-rose-500/30 text-rose-100"
                : "bg-zinc-900/95 border-zinc-700/60 text-zinc-100"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : isError ? (
                <AlertCircle className="w-5 h-5 text-rose-400" />
              ) : (
                <Info className="w-5 h-5 text-violet-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold leading-tight">{toast.title}</h4>
              {toast.message && (
                <p className="mt-1 text-xs opacity-90 leading-relaxed break-words">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 text-zinc-400 hover:text-white transition-colors p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
