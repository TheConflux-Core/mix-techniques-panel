"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://ws.mixtechniques.com";

type Phase = "idle" | "pulling" | "revealed";

export default function PullOverlay() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [genre, setGenre] = useState("");
  const [trackTitle, setTrackTitle] = useState("");
  const [poolSize, setPoolSize] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const connect = () => {
      if (wsRef.current) return;
      let ws: WebSocket;
      try { ws = new WebSocket(WS_URL); } catch { scheduleReconnect(); return; }

      ws.onopen = () => {
        if (reconnectRef.current) { clearTimeout(reconnectRef.current); reconnectRef.current = null; }
      };
      ws.onclose = () => { wsRef.current = null; scheduleReconnect(); };
      ws.onerror = () => { ws.close(); };
      ws.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }

        if (msg.type === "pull-start") {
          setPoolSize(msg.data?.poolSize || 0);
          setPhase("pulling");
          // Auto-reveal after suspense delay
          setTimeout(() => {
            setPhase((prev) => prev === "pulling" ? prev : prev); // no-op, just ensuring state
          }, 2500);
        }

        if (msg.type === "pull-announce") {
          setName(msg.data?.name || "");
          setCity(msg.data?.city || "");
          setGenre(msg.data?.genre || "");
          setTrackTitle(msg.data?.trackTitle || "");
          setPhase("revealed");
          // Auto-hide after 15 seconds
          setTimeout(() => {
            setPhase("idle");
            setName("");
          }, 15000);
        }

        // Reset on next-contestant or segment change
        if (msg.type === "next-contestant" || msg.type === "reset-episode") {
          setPhase("idle");
          setName("");
        }
      };

      wsRef.current = ws;
    };

    const scheduleReconnect = () => {
      if (reconnectRef.current) return;
      reconnectRef.current = setTimeout(() => { reconnectRef.current = null; connect(); }, 3000);
    };

    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[999] pointer-events-none" style={{ background: "transparent" }}>
      {/* Pulling phase — suspense animation */}
      {phase === "pulling" && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative">
            {/* Outer ring */}
            <div
              className="w-40 h-40 rounded-full border-4 border-transparent border-t-[#D4A843] border-r-[#D4A843]/50"
              style={{ animation: "spin 0.6s linear infinite" }}
            />
            {/* Inner ring */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-24 h-24 rounded-full border-4 border-transparent border-b-[#E89B2E] border-l-[#E89B2E]/50"
                style={{ animation: "spin 0.4s linear infinite reverse" }}
              />
            </div>
            {/* Pool count */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="font-[family-name:var(--font-display)] text-[#D4A843] text-2xl font-bold tabular-nums">
                {poolSize}
              </span>
            </div>
          </div>
          {/* DRAWING text */}
          <p
            className="absolute mt-52 font-[family-name:var(--font-display)] text-[#D4A843] text-2xl uppercase tracking-[0.3em] animate-pulse"
          >
            Drawing...
          </p>
        </div>
      )}

      {/* Revealed phase — name entrance */}
      {phase === "revealed" && name && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center" style={{ animation: "nameReveal 0.8s ease-out forwards" }}>
            <p className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs uppercase tracking-[0.3em] mb-3">
              Next up
            </p>
            <h2
              className="font-[family-name:var(--font-display)] text-5xl md:text-7xl text-[#F0E6D3] font-bold uppercase tracking-wide"
              style={{
                textShadow: "0 0 40px rgba(212,168,67,0.5), 0 0 80px rgba(212,168,67,0.2)",
                animation: "goldGlow 2s ease-in-out infinite alternate",
              }}
            >
              {name}
            </h2>
            {city && (
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/50 text-sm mt-3">
                📍 {city}
              </p>
            )}
            {genre && (
              <p className="font-[family-name:var(--font-mono)] text-[#D4A843]/70 text-xs uppercase tracking-wider mt-1">
                {genre}
              </p>
            )}
            {trackTitle && (
              <p className="font-[family-name:var(--font-display)] text-[#F0E6D3]/80 text-lg mt-4 italic">
                &ldquo;{trackTitle}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* Idle — nothing rendered (transparent) */}

      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes nameReveal {
          0% { opacity: 0; transform: scale(0.8) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes goldGlow {
          0% { text-shadow: 0 0 20px rgba(212,168,67,0.3), 0 0 40px rgba(212,168,67,0.1); }
          100% { text-shadow: 0 0 40px rgba(212,168,67,0.6), 0 0 80px rgba(212,168,67,0.3); }
        }
      `}</style>
    </div>
  );
}
