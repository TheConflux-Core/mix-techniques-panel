"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Submission } from "@/lib/types";
import Navbar from "@/components/Navbar";
import PullReveal from "@/components/PullReveal";
import PulledList from "@/components/PulledList";

export default function PullPage() {
  const [phase, setPhase] = useState<"idle" | "pulling" | "revealed">("idle");
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(null);
  const [pulled, setPulled] = useState<Submission[]>([]);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      fetchPoolSize();
    };
    checkAuth();
  }, []);

  const fetchPoolSize = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/submissions?status=submitted", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) { const data = await res.json(); setPoolSize(data.length); }
    } catch { /* silent */ }
  };

  const handlePull = useCallback(async () => {
    setLoading(true); setError(null); setPhase("pulling");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      await new Promise((resolve) => setTimeout(resolve, 800));
      const res = await fetch("/api/submissions/pull", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to pull"); }
      const data = await res.json();
      setCurrentSubmission(data.submission); setPoolSize(data.pool_size); setPhase("revealed");
    } catch (err: any) { setError(err.message); setPhase("idle"); }
    finally { setLoading(false); }
  }, [router, supabase]);

  const handleConfirm = useCallback(async () => {
    if (!currentSubmission) return;
    setLoading(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      const res = await fetch("/api/submissions/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submission_id: currentSubmission.id }),
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to confirm pull"); }
      const confirmed = await res.json();
      setPulled((prev) => [confirmed, ...prev]); setCurrentSubmission(null); setPhase("idle");
      await fetchPoolSize();
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  }, [currentSubmission, router, supabase]);

  const handleResetPool = async () => {
    if (!confirm("Reset the pool? All 'selected' submissions will return to 'submitted' status.")) return;
    setResetting(true); setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      const res = await fetch("/api/submissions/reset-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { const body = await res.json(); throw new Error(body.error || "Failed to reset pool"); }
      const data = await res.json();
      setPulled([]); setCurrentSubmission(null); setPhase("idle");
      await fetchPoolSize();
      alert(`Pool reset complete. ${data.reset_count} submissions returned.`);
    } catch (err: any) { setError(err.message); }
    finally { setResetting(false); }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl text-[#D4A843] uppercase tracking-[0.2em] font-bold gold-shimmer">
                The Pull
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm mt-2 uppercase tracking-wider">
                Who&apos;s next?
              </p>
            </div>
            <button
              onClick={handleResetPool}
              disabled={resetting}
              className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/40 hover:text-red-400 transition-all border border-[#3A2818] hover:border-red-400/30 hover:shadow-[0_0_15px_rgba(239,68,68,0.1)] px-4 py-2 rounded disabled:opacity-30"
            >
              {resetting ? "Resetting..." : "Reset Pool"}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-6 max-w-2xl mx-auto error-shake">
              {error}
            </div>
          )}

          <PullReveal
            submission={currentSubmission}
            phase={phase}
            onPull={handlePull}
            onConfirm={handleConfirm}
            poolSize={poolSize}
            loading={loading}
          />

          <PulledList pulled={pulled} />
        </div>
      </main>
    </div>
  );
}
