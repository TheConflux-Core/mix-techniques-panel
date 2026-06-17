"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/dashboard");
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login catch:", err);
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none -z-10" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50 -z-10" />
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-3xl uppercase tracking-[0.15em] font-bold mb-3 gold-shimmer">
            Staff Panel
          </h1>
          <p className="font-[family-name:var(--font-mono)] text-[#D4A843] text-sm tracking-[0.2em] uppercase">
            Sign in to manage submissions
          </p>
        </div>

        <div className="card-float noise carbon-fiber-walnut rounded-xl p-8 relative overflow-hidden">
          <form onSubmit={handleLogin} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm error-shake">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs text-[#F0E6D3]/60 font-[family-name:var(--font-mono)] mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0F0A07] border border-[#3A2818] text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm rounded px-4 py-3 placeholder:text-[#F0E6D3]/20"
                placeholder="admin@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-[#F0E6D3]/60 font-[family-name:var(--font-mono)] mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0F0A07] border border-[#3A2818] text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm rounded px-4 py-3 placeholder:text-[#F0E6D3]/20"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-3d w-full text-[#1A0F0A] font-[family-name:var(--font-display)] text-lg uppercase tracking-[0.15em] py-3 rounded font-bold"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
