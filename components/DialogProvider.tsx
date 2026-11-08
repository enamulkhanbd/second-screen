"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

interface PromptOptions {
  title: string;
  description?: React.ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Lets the user submit an empty value (resolves ""); cancel still resolves null. */
  allowEmpty?: boolean;
}

interface DialogApi {
  /** Resolves true when the user confirms, false when they cancel or dismiss. */
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  /** Resolves the trimmed text, or null when the user cancels or leaves it empty. */
  prompt: (options: PromptOptions) => Promise<string | null>;
}

type ActiveDialog =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (value: boolean) => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (value: string | null) => void };

const DialogContext = createContext<DialogApi | null>(null);

export function useDialogs(): DialogApi {
  const api = useContext(DialogContext);
  if (!api) {
    throw new Error("useDialogs must be used inside <DialogProvider>");
  }
  return api;
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [active, setActive] = useState<ActiveDialog | null>(null);
  const [value, setValue] = useState("");
  // Keep the last dialog rendered while the close animation runs.
  const lastActive = useRef<ActiveDialog | null>(null);
  if (active) lastActive.current = active;

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setActive({ kind: "confirm", options, resolve });
      }),
    []
  );

  const prompt = useCallback(
    (options: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setValue(options.defaultValue ?? "");
        setActive({ kind: "prompt", options, resolve });
      }),
    []
  );

  const api = useMemo(() => ({ confirm, prompt }), [confirm, prompt]);

  const close = (result: boolean | string | null) => {
    if (!active) return;
    if (active.kind === "confirm") active.resolve(result === true);
    else active.resolve(typeof result === "string" ? result : null);
    setActive(null);
  };

  const shown = active ?? lastActive.current;

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Dialog
        open={Boolean(active)}
        onOpenChange={(open) => {
          if (!open) close(active?.kind === "confirm" ? false : null);
        }}
      >
        {shown && (
          <DialogContent className="sm:max-w-md font-sans">
            <DialogHeader>
              <DialogTitle>{shown.options.title}</DialogTitle>
              {shown.options.description && (
                <DialogDescription className="text-xs leading-relaxed">
                  {shown.options.description}
                </DialogDescription>
              )}
            </DialogHeader>

            {shown.kind === "prompt" ? (
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = value.trim();
                  close(trimmed || shown.options.allowEmpty ? trimmed : null);
                }}
              >
                <div className="space-y-1.5">
                  {shown.options.label && (
                    <Label htmlFor="dialog-provider-input" className="text-xs font-semibold">
                      {shown.options.label}
                    </Label>
                  )}
                  <Input
                    id="dialog-provider-input"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder={shown.options.placeholder}
                    autoFocus
                    className="h-9 text-xs"
                  />
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => close(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={!value.trim() && !shown.options.allowEmpty}>
                    {shown.options.confirmLabel ?? "Save"}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => close(false)}>
                  {shown.options.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={shown.options.destructive ? "destructive" : "default"}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {shown.options.confirmLabel ?? "Confirm"}
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        )}
      </Dialog>
    </DialogContext.Provider>
  );
};
