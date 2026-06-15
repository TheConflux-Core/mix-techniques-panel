"use client";

import { useState, useEffect } from "react";
import type { Submission } from "@/lib/types";
import { GENRE_OPTIONS } from "@/lib/types";

interface PullRevealProps {
  submission: Submission | null;
  phase: "idle" | "pulling" | "revealed";
  onPull: () => void;
  onConfirm: () => void;
  poolSize: number;
  loading: boolean;
}

export default function PullReveal({
  submission,
  phase,
  onPull,
  onConfirm,
  poolSize,
  loading,
}: PullRevealProps) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (phase === "revealed" && submission) {
      setShowDetails(false);
      const timer = setTimeout(() => setShowDetails(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowDetails(false);
    }
  }, [phase, submission]);

  const getGenreLabel = (value: string) =>
    GENRE_OPTIONS.find((g) => g.value === value)?.label || value;

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-2xl mx-auto rounded-2xl overflow-hidden"
        style={{ minHeight: "400px" }}
      >
        <div className="absolute inset-0 bg-[#0F0A07] rounded-2xl border border-[#3A2818] overflow-hidden">
          {/* Warm ambient glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 30% 40%, rgba(212,168,67,0.04) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(232,155,46,0.03) 0%, transparent 50%)",
            }}
          />
          {phase === "revealed" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-[600px] h-[600px] rounded-full opacity-20"
                style={{
                  background:
                    "radial-gradient(circle, rgba(212,168,67,0.4) 0%, rgba(212,168,67,0) 70%)",
                  animation: "glowPulse 2s ease-in-out infinite",
                }}
              />
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center p-8 md:p-12" style={{ minHeight: "400px" }}>
          {phase === "idle" && (
            <div className="text-center animate-fade-in">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-sm uppercase tracking-[0.2em] mb-2">
                Pool Size
              </p>
              <p className="font-[family-name:var(--font-display)] text-6xl md:text-8xl text-[#D4A843] font-bold tabular-nums">
                {poolSize}
              </p>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-2">
                submissions waiting
              </p>
            </div>
          )}

          {phase === "pulling" && (
            <div className="text-center">
              <div className="relative">
                <div
                  className="w-32 h-32 rounded-full border-4 border-transparent border-t-[#D4A843] border-r-[#D4A843]/50 mx-auto"
                  style={{ animation: "spin 0.6s linear infinite" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className="w-20 h-20 rounded-full border-4 border-transparent border-b-[#E89B2E] border-l-[#E89B2E]/50"
                    style={{ animation: "spin 0.4s linear infinite reverse" }}
                  />
                </div>
              </div>
              <p className="font-[family-name:var(--font-display)] text-[#D4A843] text-2xl uppercase tracking-[0.3em] mt-8 animate-pulse">
                Drawing...
              </p>
            </div>
          )}

          {phase === "revealed" && submission && (
            <div className="text-center w-full">
              <div
                className="mb-6"
                style={{ animation: "nameReveal 0.8s ease-out forwards" }}
              >
                <p className="font-[family-name:var(--font-mono)] text-[#D4A843]/60 text-xs uppercase tracking-[0.3em] mb-3">
                  Next up
                </p>
                <h2
                  className="font-[family-name:var(--font-display)] text-4xl md:text-6xl text-[#F0E6D3] font-bold uppercase tracking-wide"
                  style={{
                    textShadow:
                      "0 0 40px rgba(212,168,67,0.5), 0 0 80px rgba(212,168,67,0.2)",
                    animation: "goldGlow 2s ease-in-out infinite alternate",
                  }}
                >
                  {submission.name}
                </h2>
              </div>

              {showDetails && (
                <div
                  className="space-y-2"
                  style={{ animation: "fadeIn 0.5s ease-out forwards" }}
                >
                  {submission.location && (
                    <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/50 text-sm">
                      📍 {submission.location}
                    </p>
                  )}
                  <p className="font-[family-name:var(--font-mono)] text-[#D4A843]/70 text-xs uppercase tracking-wider">
                    {getGenreLabel(submission.genre)}
                  </p>
                  {submission.track_title && (
                    <p className="font-[family-name:var(--font-display)] text-[#F0E6D3]/80 text-lg mt-4 italic">
                      &ldquo;{submission.track_title}&rdquo;
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 mt-8">
        {(phase === "idle" || phase === "revealed") && (
          <button
            onClick={onPull}
            disabled={loading || poolSize === 0}
            className="btn-3d relative disabled:opacity-30 disabled:cursor-not-allowed px-12 py-5 rounded-xl font-[family-name:var(--font-display)] text-xl uppercase tracking-[0.2em] font-bold text-[#1A0F0A]"
          >
            {phase === "revealed" ? "Pull Again" : "THE PULL"}
          </button>
        )}

        {phase === "revealed" && submission && (
          <button
            onClick={onConfirm}
            disabled={loading}
            className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#D4A843] transition-all border border-[#3A2818] hover:border-[#D4A843]/40 hover:shadow-[0_0_20px_rgba(212,168,67,0.15)] px-6 py-3 rounded-lg disabled:opacity-30"
          >
            {loading ? "Confirming..." : "Confirm & Lock In"}
          </button>
        )}

        {poolSize === 0 && phase === "idle" && (
          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm mt-4">
            No submissions in the pool. Waiting for entries...
          </p>
        )}
      </div>
    </div>
  );
}
