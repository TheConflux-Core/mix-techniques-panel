"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import type { Submission } from "@/lib/types";
import { GENRE_OPTIONS, STATUS_OPTIONS } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import AudioPlayer from "./AudioPlayer";
import WaveformPreview from "./WaveformPreview";

interface AdminTableProps {
  submissions: Submission[];
  onStatusChange: (id: string, status: string) => Promise<void>;
}

export default function AdminTable({ submissions, onStatusChange }: AdminTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = submissions.filter((s) => {
    if (genreFilter !== "all" && s.genre !== genreFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const getGenreLabel = (value: string) =>
    GENRE_OPTIONS.find((g) => g.value === value)?.label || value;

  return (
    <div>
      {/* Pull Button */}
      <div className="flex justify-end mb-4">
        <Link
          href="/pull"
          className="btn-3d font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] font-medium px-5 py-2 rounded"
        >
          🎲 Pull Contestants
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-xs text-[#F0E6D3]/50 font-[family-name:var(--font-mono)] mb-1 uppercase tracking-wider">
            Genre
          </label>
          <select
            value={genreFilter}
            onChange={(e) => setGenreFilter(e.target.value)}
            className="bg-[#0F0A07] border border-[#3A2818] text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm rounded px-3 py-2 focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843]/30 outline-none"
          >
            <option value="all">All Genres</option>
            {GENRE_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-[#F0E6D3]/50 font-[family-name:var(--font-mono)] mb-1 uppercase tracking-wider">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#0F0A07] border border-[#3A2818] text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm rounded px-3 py-2 focus:border-[#D4A843] focus:ring-1 focus:ring-[#D4A843]/30 outline-none"
          >
            <option value="all">All Statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-[family-name:var(--font-mono)]">
          <thead>
            <tr className="border-b border-[#3A2818]">
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Name</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Episode</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Genre</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Track Title</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Status</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Date</th>
              <th className="text-left py-3 px-4 text-[#D4A843] uppercase tracking-wider text-xs font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[#F0E6D3]/30">
                  No submissions found.
                </td>
              </tr>
            ) : (
              filtered.map((sub, i) => (
                <Fragment key={sub.id}>
                  <tr
                    className={`border-b border-[#3A2818]/50 cursor-pointer hover:bg-[#2A1810]/50 transition-colors ${
                      i % 2 === 0 ? "bg-[#1A0F0A]" : "bg-[#2A1810]/30"
                    }`}
                    onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  >
                    <td className="py-3 px-4 text-[#F0E6D3]">{sub.name}</td>
                    <td className="py-3 px-4 text-[#F0E6D3]/60">
                      {sub.episodes ? `Ep.${String(sub.episodes.episode_number).padStart(2, "0")}` : "—"}
                    </td>
                    <td className="py-3 px-4 text-[#F0E6D3]/70">{getGenreLabel(sub.genre)}</td>
                    <td className="py-3 px-4 text-[#F0E6D3]/70">{sub.track_title || "—"}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={sub.status} />
                    </td>
                    <td className="py-3 px-4 text-[#F0E6D3]/50 text-xs">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        className="text-[#D4A843] hover:text-[#E89B2E] text-xs underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedId(expandedId === sub.id ? null : sub.id);
                        }}
                      >
                        {expandedId === sub.id ? "Collapse" : "Expand"}
                      </button>
                    </td>
                  </tr>
                  {expandedId === sub.id && (
                    <tr key={`${sub.id}-expanded`}>
                      <td colSpan={7} className="bg-[#0F0A07] px-6 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-[#F0E6D3]/50 mb-1 uppercase tracking-wider">Email</p>
                            <p className="text-[#F0E6D3] text-sm">{sub.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-[#F0E6D3]/50 mb-1 uppercase tracking-wider">Location</p>
                            <p className="text-[#F0E6D3] text-sm">{sub.location || "—"}</p>
                          </div>
                          {sub.social_links && Object.keys(sub.social_links).length > 0 && (
                            <div className="md:col-span-2">
                              <p className="text-xs text-[#F0E6D3]/50 mb-1 uppercase tracking-wider">Social Links</p>
                              <div className="flex flex-wrap gap-3">
                                {Object.entries(sub.social_links).map(
                                  ([platform, url]) =>
                                    url && (
                                      <a
                                        key={platform}
                                        href={url as string}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#D4A843] hover:text-[#E89B2E] text-xs underline"
                                      >
                                        {platform}
                                      </a>
                                    )
                                )}
                              </div>
                            </div>
                          )}
                          <div className="md:col-span-2">
                            <p className="text-xs text-[#F0E6D3]/50 mb-2 uppercase tracking-wider">Track</p>
                            <AudioPlayer src={sub.track_signed_url || sub.track_url} className="mb-3" />
                            {sub.waveform_data && sub.waveform_data.length > 0 && (
                              <WaveformPreview peaks={sub.waveform_data} height={48} barWidth={2} barGap={1} />
                            )}
                          </div>
                          <div className="md:col-span-2 flex flex-wrap gap-2 pt-2">
                            {sub.status === "submitted" && (
                              <button
                                onClick={() => onStatusChange(sub.id, "under_review")}
                                className="px-4 py-2 bg-[#E89B2E] text-[#1A0F0A] text-xs font-[family-name:var(--font-mono)] font-medium rounded hover:bg-[#D4A843] transition-colors hover:shadow-[0_0_15px_rgba(212,168,67,0.2)]"
                              >
                                Mark Under Review
                              </button>
                            )}
                            {(sub.status === "submitted" || sub.status === "under_review") && (
                              <button
                                onClick={() => onStatusChange(sub.id, "selected")}
                                className="px-4 py-2 bg-[#D4A843] text-[#1A0F0A] text-xs font-[family-name:var(--font-mono)] font-medium rounded hover:bg-[#E89B2E] transition-colors hover:shadow-[0_0_15px_rgba(212,168,67,0.2)]"
                              >
                                Mark Selected
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
