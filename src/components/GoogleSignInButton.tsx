"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            cfg: { theme?: string; size?: string; width?: number; text?: string },
          ) => void;
        };
      };
    };
  }
}

type Props = {
  mode: "staff" | "guest";
  code: string;
  onToken: (idToken: string) => void | Promise<void>;
  disabled?: boolean;
  label?: string;
};

export function GoogleSignInButton({ mode, code, onToken, disabled, label }: Props) {
  const slot = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [error, setError] = useState("");
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    void fetch("/api/auth/google")
      .then((r) => r.json())
      .then((d: { enabled?: boolean; clientId?: string | null }) => {
        setEnabled(Boolean(d.enabled && d.clientId));
        setClientId(d.clientId || "");
      })
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled || !clientId || !slot.current || disabled || !code.trim()) return;
    let cancelled = false;

    function mount() {
      if (cancelled || !slot.current || !window.google?.accounts?.id) return;
      slot.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (res) => {
          if (res.credential) void cb.current(res.credential);
        },
      });
      window.google.accounts.id.renderButton(slot.current, {
        theme: "outline",
        size: "large",
        width: 280,
        text: mode === "guest" ? "signup_with" : "signin_with",
      });
    }

    if (window.google?.accounts?.id) {
      mount();
      return () => {
        cancelled = true;
      };
    }

    const existing = document.querySelector('script[data-ordo-google="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", mount);
      return () => {
        cancelled = true;
        existing.removeEventListener("load", mount);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.dataset.ordoGoogle = "1";
    script.onload = () => mount();
    script.onerror = () => setError("Could not load Google Sign-In");
    document.head.appendChild(script);
    return () => {
      cancelled = true;
    };
  }, [enabled, clientId, disabled, code, mode]);

  if (!enabled) {
    return (
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#646970" }}>
        Google / Gmail login turns on when Super sets{" "}
        <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> on the host.
      </p>
    );
  }

  if (!code.trim()) {
    return (
      <p style={{ margin: "0.5rem 0 0", fontSize: "0.82rem", color: "#646970" }}>
        Enter the restaurant code first, then use Gmail.
      </p>
    );
  }

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {label && (
        <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", fontWeight: 600 }}>{label}</p>
      )}
      <div ref={slot} style={{ minHeight: 44, opacity: disabled ? 0.5 : 1 }} />
      {error && <p style={{ color: "#b32d2e", fontSize: "0.82rem" }}>{error}</p>}
    </div>
  );
}
