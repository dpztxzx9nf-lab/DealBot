"use client";

import { useEffect } from "react";

/**
 * Remote tunnel/PWA testing does not need dev HMR websockets.
 * Prevents noisy failed connections to /_next/webpack-hmr from breaking UX.
 */
export function DevTunnelHmrGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const host = window.location.hostname;
    const isTunnel =
      host.endsWith(".trycloudflare.com") ||
      host.endsWith(".cfargotunnel.com");

    if (!isTunnel) return;

    const Native = window.WebSocket;
    const Patched = function (
      url: string | URL,
      protocols?: string | string[]
    ) {
      const href = String(url);
      if (
        href.includes("/_next/webpack-hmr") ||
        href.includes("/_next/turbopack-hmr")
      ) {
        const stub = {
          close() {},
          send() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return true;
          },
          readyState: 3,
          CONNECTING: 0,
          OPEN: 1,
          CLOSING: 2,
          CLOSED: 3,
          binaryType: "blob" as BinaryType,
          extensions: "",
          protocol: "",
          bufferedAmount: 0,
          onopen: null,
          onclose: null,
          onerror: null,
          onmessage: null,
        };
        return stub as unknown as WebSocket;
      }
      return new Native(url, protocols);
    };
    Patched.prototype = Native.prototype;
    Object.assign(Patched, {
      CONNECTING: Native.CONNECTING,
      OPEN: Native.OPEN,
      CLOSING: Native.CLOSING,
      CLOSED: Native.CLOSED,
    });
    window.WebSocket = Patched as unknown as typeof WebSocket;

    console.info(
      "[DealBot] Tunnel mode: HMR websocket disabled (app works without hot reload)."
    );
  }, []);

  return null;
}
