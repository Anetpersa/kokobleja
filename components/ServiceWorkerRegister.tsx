"use client";

import { useEffect } from "react";
import "@/lib/install"; // da hvatanje „može da se instalira” krene odmah

// Prijavljuje service worker (potreban za instalaciju, offline stranicu i, u koraku 6b, obaveštenja)
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return; // u razvoju bi keš smetao
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
