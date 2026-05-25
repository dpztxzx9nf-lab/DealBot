"use client";

import { useEffect, useState } from "react";

function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    nav.standalone === true
  );
}

export function PwaHttpWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      if (window.location.protocol === "http:" && isStandalonePwa()) {
        setShow(true);
      }
    });
  }, []);

  if (!show) return null;

  return (
    <div
      role="alert"
      className="mx-4 mb-2 rounded-xl border-2 border-red-500 bg-red-950/90 p-4 text-sm text-red-100"
    >
      <p className="font-bold text-red-300">HTTPS required for installed app</p>
      <p className="mt-2 leading-relaxed">
        iOS blocks this home-screen app over HTTP (HTTPS-Only). Run{" "}
        <code className="rounded bg-zinc-900 px-1">npm run dev:tunnel</code> on
        your PC, open the printed <strong>https://….trycloudflare.com</strong> URL
        in Safari, then re-add to Home Screen. LAN option:{" "}
        <code className="rounded bg-zinc-900 px-1">npm run setup:https</code> then{" "}
        <code className="rounded bg-zinc-900 px-1">npm run dev:https</code>.
      </p>
    </div>
  );
}
