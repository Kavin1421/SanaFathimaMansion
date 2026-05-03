"use client";

import { useEffect } from "react";

/** Registers `/sw.js` in production so the app meets PWA install criteria where supported. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      /* non-blocking */
    });
  }, []);
  return null;
}
