"use client";

import { useState, useEffect, useCallback } from "react";
import type { User } from "@/lib/types";

interface UsersSectionProps {
  token: string;
}

export default function UsersSection({ token }: UsersSectionProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "judges" | "artists" | "viewers">("all");

  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filter !== "all") params.set("filter", filter);

      const res = await fetch(`/api/users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [token, search, filter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch]);

  const toggleJudge = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ is_judge: !user.is_judge }),
      });

      if (!res.ok) throw new Error("Failed to update user");
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    }
  };

  const filteredUsers = users.filter((u) => {
    if (filter === "judges") return u.is_judge;
    if (filter === "artists") return !u.is_judge; // artists = non-judges for now
    return true;
  });

  const judgeCount = users.filter((u) => u.is_judge).length;

  return (
    <div className="card-float noise carbon-fiber-walnut rounded-xl p-4 md:p-6 relative overflow-hidden mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[#F0E6D3] uppercase tracking-[0.1em] font-bold">
            Users
          </h2>
          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-sm mt-1">
            {users.length} user{users.length !== 1 ? "s" : ""} · {judgeCount} judge{judgeCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0F0A07] border border-[#3A2818] text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm rounded px-3 py-2 pl-8 w-64 focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843]/30 outline-none placeholder:text-[#F0E6D3]/20"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#F0E6D3]/30"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(["all", "judges", "artists", "viewers"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`font-[family-name:var(--font-mono)] text-xs px-3 py-1.5 rounded border transition-all ${
              filter === f
                ? "border-[#D4A843] text-[#D4A843] bg-[#D4A843]/10"
                : "border-[#3A2818] text-[#F0E6D3]/50 hover:border-[#D4A843]/40 hover:text-[#D4A843]/70"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-4 error-shake">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm">
            Loading users...
          </p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm">
            {search ? "No users match your search." : "No users found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-[family-name:var(--font-mono)]">
            <thead>
              <tr className="border-b border-[#3A2818]">
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Name</th>
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Email</th>
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Location</th>
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Role</th>
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Joined</th>
                <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, i) => (
                <tr
                  key={user.id}
                  className={`border-b border-[#3A2818]/50 hover:bg-[#2A1810]/50 transition-colors ${
                    i % 2 === 0 ? "bg-[#1A0F0A]" : "bg-[#2A1810]/30"
                  }`}
                >
                  <td className="py-3 px-4 text-[#F0E6D3]">
                    {user.name || "—"}
                  </td>
                  <td className="py-3 px-4 text-[#F0E6D3]/70">{user.email}</td>
                  <td className="py-3 px-4 text-[#F0E6D3]/50">{user.location || "—"}</td>
                  <td className="py-3 px-4">
                    {user.is_judge ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#D4A843] text-[#1A0F0A] text-xs font-medium uppercase tracking-wider">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        Judge
                      </span>
                    ) : (
                      <span className="text-[#F0E6D3]/40 text-xs uppercase tracking-wider">
                        Viewer
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-[#F0E6D3]/50 text-xs">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleJudge(user)}
                      className={`text-xs underline transition-colors ${
                        user.is_judge
                          ? "text-red-400 hover:text-red-300"
                          : "text-[#D4A843] hover:text-[#E89B2E]"
                      }`}
                    >
                      {user.is_judge ? "Remove Judge" : "Make Judge"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
