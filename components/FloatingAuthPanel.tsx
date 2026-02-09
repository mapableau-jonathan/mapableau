"use client";

import { X } from "lucide-react";
import { useCallback, useEffect } from "react";

import LoginClient from "@/app/login/LoginClient";
import { Button } from "@/components/ui/button";
import { RegisterForm } from "@/components/RegisterForm";
import { cn } from "@/lib/utils";

export type AuthPanelMode = "login" | "register";

type FloatingAuthPanelProps = {
  open: boolean;
  mode: AuthPanelMode;
  onClose: () => void;
  onSwitchMode: (mode: AuthPanelMode) => void;
};

export function FloatingAuthPanel({
  open,
  mode,
  onClose,
  onSwitchMode,
}: FloatingAuthPanelProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, handleEscape]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Sign in" : "Create account"}
    >
      {/* Backdrop – 75% opacity, 4–8px blur per design system */}
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        aria-label="Close"
      />

      {/* Panel – glass morphism */}
      <div
        className={cn(
          "relative w-full max-w-md max-h-[90vh] overflow-y-auto",
          "rounded-xl border border-border shadow-xl",
          "bg-background/95 backdrop-blur-md",
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-4 py-3 rounded-t-xl">
          <div className="flex rounded-lg bg-muted/60 p-0.5" role="tablist" aria-label="Sign in or create account">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              aria-controls="auth-panel-content"
              id="auth-tab-login"
              onClick={() => onSwitchMode("login")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "login"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              aria-controls="auth-panel-content"
              id="auth-tab-register"
              onClick={() => onSwitchMode("register")}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === "register"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Create account
            </button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mr-1"
          >
            <X className="h-5 w-5" aria-hidden />
          </Button>
        </div>

        <div id="auth-panel-content" role="tabpanel" className="p-4 pt-4">
          {mode === "login" ? (
            <LoginClient callbackUrlOverride="/dashboard" />
          ) : (
            <RegisterForm compact onSuccess={onClose} />
          )}
        </div>
      </div>
    </div>
  );
}
