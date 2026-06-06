"use client";

import { useEffect, useState } from "react";

/** Returns polling interval when the browser tab is visible; false when hidden. */
export function useRefetchIntervalMs(ms = 20_000): number | false {
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || !document.hidden,
  );

  useEffect(() => {
    const fn = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, []);

  return visible ? ms : false;
}
