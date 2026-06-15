"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Submission } from "@/lib/types";
import Navbar from "@/components/Navbar";
import AdminTable from "@/components/AdminTable";

export default function AdminDashboard() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/");
        return;
      }
      fetchSubmissions();
    };
    checkAuth();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch("/api/submissions", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Failed to fetch submissions");
      }

      const data = await res.json();
      setSubmissions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/submissions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        throw new Error("Failed to update status");
      }

      await fetchSubmissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl text-[#F0E6D3] uppercase tracking-[0.15em] font-bold">
                Dashboard
              </h1>
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-sm mt-1">
                {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#D4A843] transition-all border border-[#3A2818] hover:border-[#D4A843]/40 hover:shadow-[0_0_15px_rgba(212,168,67,0.15)] px-4 py-2 rounded"
            >
              Logout
            </button>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-6 error-shake">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-20">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm">
                Loading submissions...
              </p>
            </div>
          ) : (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 md:p-6 relative overflow-hidden">
              <AdminTable
                submissions={submissions}
                onStatusChange={handleStatusChange}
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
