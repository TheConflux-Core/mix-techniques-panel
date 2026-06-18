"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useParams } from "next/navigation";
import type { Episode, Submission } from "@/lib/types";
import { GENRE_OPTIONS } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EpisodeHeader from "@/components/show-runner/EpisodeHeader";
import ContestantQueue from "@/components/show-runner/ContestantQueue";
import SegmentControl from "@/components/show-runner/SegmentControl";
import Timer from "@/components/show-runner/Timer";
import LiveScores, { type MetricScores } from "@/components/show-runner/LiveScores";
import AudioControls from "@/components/show-runner/AudioControls";
import PreFlightCheck from "@/components/show-runner/PreFlightCheck";
import QuickActions from "@/components/show-runner/QuickActions";
import StatusBadge from "@/components/StatusBadge";
import { useOverlaySocket } from "@/lib/useOverlaySocket";

export default function EpisodeRunnerClient() {
  const params = useParams();
  const episodeId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [episode, setEpisode] = useState<Episode | null>(null);
  const [contestants, setContestants] = useState<Submission[]>([]);
  const [availableSubmissions, setAvailableSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeContestantIndex, setActiveContestantIndex] = useState(0);

  // Submission management
  const [toggling, setToggling] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState("");
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [lastPulled, setLastPulled] = useState<Submission | null>(null);

  // Live control state
  const [currentSegment, setCurrentSegment] = useState("COLD_OPEN");
  const [segmentHistory, setSegmentHistory] = useState<string[]>([]);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);

  // Scoring & Audio state
  const emptyMetrics: MetricScores = { lowEnd: 0, clarity: 0, balance: 0, dynamics: 0, image: 0 };
  const [hostMetrics, setHostMetrics] = useState<MetricScores>({ ...emptyMetrics });
  const [viewerMetrics, setViewerMetrics] = useState<MetricScores>({ ...emptyMetrics });
  const [viewerVotes, setViewerVotes] = useState(0);
  const [scoreLocked, setScoreLocked] = useState(false);
  const [votingClosed, setVotingClosed] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<{ title: string; artist: string; url: string } | null>(null);
  const [volume, setVolume] = useState(70);

  // Operations state
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [previousSegment, setPreviousSegment] = useState("COLD_OPEN");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { connected, sendMessage, pushSegment, pushContestant, pushTrack, pushEpisodeStatus, pushLockScore, pushPlayTrack, pushPauseTrack, pushPullStart, pushPullAnnounce } = useOverlaySocket();

  const isLive = episode?.status === "live";
  const isReady = episode?.status === "ready";
  const controlsEnabled = isLive || isReady;

  const hasBackup = contestants.some((c) => c.pull_order === 4);
  const contestantsConfirmed = contestants.filter((c) => c.status === "selected" || c.status === "aired").length;
  const allTracksLoaded = contestants.length > 0 && contestants.every((c) => c.track_url);

  const assignable = availableSubmissions.filter(
    (s) => !contestants.find((c) => c.id === s.id)
  );

  const getGenreLabel = (value: string) =>
    GENRE_OPTIONS.find((g) => g.value === value)?.label || value;

  const getNextStatus = (current: string) => {
    switch (current) {
      case "setup": return { label: "✅ Mark Ready", status: "ready", desc: "Lock lineup, close submissions." };
      case "ready": return { label: "🔴 GO LIVE", status: "live", desc: "Start broadcast." };
      // "live" has no next-status button — timer controls replace it, End Show is in QuickActions
      case "post_production": return { label: "Publish", status: "published", desc: "Finalize scores, update leaderboard." };
      default: return null;
    }
  };

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timerRunning]);

  // ─── Data fetching ────────────────────────────────────────
  const fetchEpisode = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      const res = await fetch(`/api/episodes/${episodeId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setEpisode(await res.json());
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [episodeId]);

  const fetchContestants = useCallback(async (epId: string, token: string) => {
    try {
      const res = await fetch(`/api/episodes/${epId}/contestants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setContestants(await res.json());
    } catch { /* silent */ }
  }, []);

  const fetchAvailable = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/submissions?status=submitted&episode_id=${episodeId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) setAvailableSubmissions(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      await Promise.all([
        fetchEpisode(),
        fetchAvailable(),
      ]);
      setLoading(false);
    };
    init();
  }, [fetchEpisode, fetchAvailable]);

  // ─── Realtime: listen for new submissions ─────────────────
  useEffect(() => {
    if (!episodeId) return;
    const channel = supabase
      .channel("submissions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "submissions" },
        () => {
          // Refetch both lists when a new submission arrives
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              fetchContestants(episodeId, session.access_token);
              fetchAvailable();
            }
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "submissions" },
        () => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              fetchContestants(episodeId, session.access_token);
              fetchAvailable();
            }
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [episodeId, fetchContestants, fetchAvailable]);

  // Fetch contestants when episode loads
  useEffect(() => {
    if (episode) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) fetchContestants(episode.id, session.access_token);
      });
    }
  }, [episode]);

  // ─── Submission management ────────────────────────────────
  const handleToggleSubmissions = async () => {
    if (!episode) return;
    setToggling(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${episodeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submissions_open: !episode.submissions_open }),
      });
      if (!res.ok) throw new Error("Failed to update submission status");
      setEpisode(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setToggling(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedSubmissionId) return;
    setAssigning(selectedSubmissionId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const nextOrder = contestants.length > 0
        ? Math.max(...contestants.map((c) => c.pull_order || 0)) + 1
        : 1;
      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submission_id: selectedSubmissionId, pull_order: nextOrder }),
      });
      if (!res.ok) throw new Error("Failed to assign submission");
      setSelectedSubmissionId("");
      setShowAssignPanel(false);
      await Promise.all([fetchContestants(episodeId, session.access_token), fetchAvailable()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(null);
    }
  };

  const handlePull = async () => {
    setPulling(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Random selection from pool
      const pullRes = await fetch("/api/submissions/pull", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!pullRes.ok) { const body = await pullRes.json(); throw new Error(body.error || "Failed to pull"); }
      const { submission, pool_size } = await pullRes.json();

      // 2. Trigger overlay animation (name hidden)
      pushPullStart(pool_size);

      // 3. Assign to this episode
      const nextOrder = contestants.length > 0
        ? Math.max(...contestants.map((c) => c.pull_order || 0)) + 1
        : 1;
      const assignRes = await fetch(`/api/episodes/${episodeId}/contestants`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ submission_id: submission.id, pull_order: nextOrder }),
      });
      if (!assignRes.ok) throw new Error("Failed to assign pulled submission");

      setLastPulled(submission);
      await Promise.all([fetchContestants(episodeId, session.access_token), fetchAvailable()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  };

  const handleAnnounce = async () => {
    if (!lastPulled) return;
    pushPullAnnounce({
      name: lastPulled.name,
      city: lastPulled.location || "",
      genre: lastPulled.genre || "",
      trackTitle: lastPulled.track_title || "",
    });
    pushContestant({
      name: lastPulled.name,
      city: lastPulled.location || "",
      genre: lastPulled.genre || "",
      handle: lastPulled.social_links?.instagram || "",
    });
    if (lastPulled.track_title) {
      pushTrack({ title: lastPulled.track_title, artist: lastPulled.name });
    }
    setLastPulled(null);
  };

  const handleRemove = async (submissionId: string) => {
    setRemoving(submissionId);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/submissions/${submissionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: "submitted", episode_id: null }),
      });
      if (!res.ok) throw new Error("Failed to remove contestant");
      await Promise.all([fetchContestants(episodeId, session.access_token), fetchAvailable()]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRemoving(null);
    }
  };

  // ─── Status transitions ──────────────────────────────────
  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!episode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEpisode(updated);
        pushEpisodeStatus(newStatus);
        if (newStatus === "live") {
          setTimerSeconds(0);
          setTimerRunning(true);
        }
      } else {
        const errBody = await res.text();
        console.error(`[GO LIVE] PATCH failed ${res.status}:`, errBody);
        setError(`Status change failed (${res.status}): ${errBody}`);
      }
    } catch (err) {
      console.error("[GO LIVE] fetch error:", err);
      setError(`Status change error: ${err}`);
    }
  }, [episode, pushEpisodeStatus]);

  // ─── Segment / Contestant / Timer handlers ────────────────
  const handleSegmentChange = useCallback((segment: string) => {
    setCurrentSegment(segment);
    setSegmentHistory((prev) => prev.includes(segment) ? prev : [...prev, segment]);
    pushSegment(segment);
    setTimerSeconds(0);
    setTimerRunning(false);
  }, [pushSegment]);

  const handleActivateContestant = useCallback((index: number) => {
    setActiveContestantIndex(index);
    setHostMetrics({ ...emptyMetrics });
    setScoreLocked(false);
    setVotingClosed(false);
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; }
    setIsPlaying(false);
    setCurrentTrack(null);
    const c = contestants[index];
    if (c) {
      pushContestant({ name: c.name, city: c.location || "", genre: c.genre || "", handle: c.social_links?.instagram || "" });
      if (c.track_title) pushTrack({ title: c.track_title, artist: c.name });
      if (c.track_signed_url) setCurrentTrack({ title: c.track_title || "", artist: c.name, url: c.track_signed_url });
    }
  }, [contestants, pushContestant, pushTrack]);

  const handleTimerStart = useCallback(() => setTimerRunning(true), []);
  const handleTimerStop = useCallback(() => setTimerRunning(false), []);
  const handleTimerReset = useCallback(() => { setTimerRunning(false); setTimerSeconds(0); }, []);

  const handleLockScore = useCallback(() => { setScoreLocked(true); pushLockScore(); }, [pushLockScore]);
  const handleCloseVoting = useCallback(() => { setVotingClosed(true); pushSegment("VERDICT"); }, [pushSegment]);

  const handlePlay = useCallback(() => {
    if (audioRef.current && currentTrack?.url) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play();
      setIsPlaying(true);
      pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
    }
  }, [currentTrack, pushPlayTrack]);

  const handlePause = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); setIsPlaying(false); pushPauseTrack(); }
  }, [pushPauseTrack]);

  const handlePushToViewers = useCallback(() => {
    if (currentTrack) pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
  }, [currentTrack, pushPlayTrack]);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (audioRef.current) audioRef.current.volume = vol / 100;
  }, []);

  // ─── Quick actions ────────────────────────────────────────
  const handleGoToBreak = useCallback(() => {
    if (isOnBreak) { setIsOnBreak(false); handleSegmentChange(previousSegment); }
    else { setPreviousSegment(currentSegment); setIsOnBreak(true); handleSegmentChange("BREAK"); }
  }, [isOnBreak, previousSegment, currentSegment, handleSegmentChange]);

  const handleActivateBackup = useCallback(() => {
    const backupIdx = contestants.findIndex((c) => c.pull_order === 4);
    if (backupIdx === -1) return;
    const updated = [...contestants];
    const cur = updated[activeContestantIndex];
    const bak = updated[backupIdx];
    if (cur && bak) {
      const tmp = cur.pull_order; cur.pull_order = bak.pull_order; bak.pull_order = tmp;
      setContestants(updated);
      handleActivateContestant(backupIdx);
    }
  }, [contestants, activeContestantIndex, handleActivateContestant]);

  const handleSkipContestant = useCallback(() => {
    if (!window.confirm("Skip this contestant and move to next?")) return;
    const next = activeContestantIndex + 1;
    if (next < contestants.length) handleActivateContestant(next);
  }, [activeContestantIndex, contestants.length, handleActivateContestant]);

  const handleResetEpisode = useCallback(() => {
    if (!window.confirm("Reset all scores and votes for this episode?")) return;
    sendMessage("reset-episode", {});
    setHostMetrics({ ...emptyMetrics });
    setViewerMetrics({ ...emptyMetrics });
    setViewerVotes(0);
    setScoreLocked(false);
    setVotingClosed(false);
  }, [sendMessage]);

  const handleEndShow = useCallback(async () => {
    if (!window.confirm("End the show? This will stop the timer and close voting.")) return;
    await handleStatusChange("post_production");
    setTimerRunning(false);
  }, [handleStatusChange]);

  // ─── Render ───────────────────────────────────────────────
  const nextStatus = episode ? getNextStatus(episode.status) : null;

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none -z-10" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50 -z-10" />
      <Navbar />
      <main className="flex-1 px-4 py-6">
        <div className="max-w-7xl mx-auto">

          {/* Loading */}
          {loading ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                Loading...
              </p>
            </div>
          ) : !episode ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                Episode not found.{" "}
                <button onClick={() => router.push("/show-runner")} className="text-[#D4A843] hover:underline">
                  Go to Dashboard
                </button>
              </p>
            </div>
          ) : (
            <>
              {/* ── Top bar: back + ws status ── */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => router.push("/show-runner")}
                  className="font-[family-name:var(--font-mono)] text-sm text-[#F0E6D3]/50 hover:text-[#D4A843] transition-colors border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-2 rounded"
                >
                  ← Dashboard
                </button>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full transition-all ${connected ? "bg-green-500 shadow-[0_0_6px_rgba(76,175,80,0.5)]" : "bg-red-500"}`} />
                  <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider" style={{ color: connected ? "rgba(76,175,80,0.6)" : "rgba(196,57,42,0.5)" }}>
                    {connected ? "Overlays Live" : "Overlays Offline"}
                  </span>
                </div>
              </div>

              {/* ── Episode Header ── */}
              <EpisodeHeader
                episode={episode}
                contestants={contestants}
                isLive={isLive || isReady}
                timerSeconds={timerSeconds}
              />

              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded font-[family-name:var(--font-mono)] text-sm mb-4 error-shake">
                  {error}
                </div>
              )}

              {/* ═══════════════════════════════════════════════
                  CONTROL BOX — submissions + status transitions
                  ═══════════════════════════════════════════════ */}
              <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Left: submission status */}
                  <div className="flex items-center gap-4">
                    <div>
                      <h2 className="font-[family-name:var(--font-display)] text-sm text-[#D4A843] uppercase tracking-[0.15em] font-bold">
                        Submissions
                      </h2>
                      <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs mt-0.5">
                        {episode.submissions_open ? "Open" : "Closed"}
                      </p>
                    </div>
                    <button
                      onClick={handleToggleSubmissions}
                      disabled={toggling}
                      className={`font-[family-name:var(--font-mono)] text-xs px-4 py-2 rounded font-semibold tracking-wider uppercase transition-all disabled:opacity-50 ${
                        episode.submissions_open
                          ? "bg-red-900/50 border border-red-700 text-red-300 hover:bg-red-800/50"
                          : "bg-green-900/50 border border-green-700 text-green-300 hover:bg-green-800/50"
                      }`}
                    >
                      {toggling ? "Saving..." : episode.submissions_open ? "Close" : "Open"}
                    </button>

                    <button
                      onClick={() => setShowAssignPanel(!showAssignPanel)}
                      className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/70 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-2 rounded transition-colors"
                    >
                      {showAssignPanel ? "Hide Assign" : "+ Assign"}
                    </button>
                    <button
                      onClick={handlePull}
                      disabled={pulling || !controlsEnabled}
                      className="font-[family-name:var(--font-mono)] text-xs text-[#D4A843] hover:text-[#E89B2E] border border-[#D4A843]/30 hover:border-[#D4A843]/60 px-3 py-2 rounded transition-colors disabled:opacity-30"
                    >
                      {pulling ? "Drawing..." : "🎲 Pull"}
                    </button>
                    {lastPulled && (
                      <button
                        onClick={handleAnnounce}
                        className="font-[family-name:var(--font-mono)] text-xs text-green-400 hover:text-green-300 border border-green-500/30 hover:border-green-500/60 px-3 py-2 rounded transition-colors animate-pulse"
                      >
                        📢 Announce
                      </button>
                    )}
                  </div>

                  {/* Right: status transition */}
                  <div className="flex items-center gap-3">
                    {episode.status === "ready" && (
                      <button
                        onClick={() => router.push("/show-runner")}
                        className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/40 hover:text-[#D4A843] border border-[#3A2818] hover:border-[#D4A843]/40 px-3 py-2 rounded transition-colors"
                      >
                        ← Back to Setup
                      </button>
                    )}
                    {isLive && (
                      <>
                        <button
                          onClick={timerRunning ? handleTimerStop : handleTimerStart}
                          className={`font-[family-name:var(--font-mono)] text-sm px-5 py-2.5 rounded font-semibold tracking-wider uppercase transition-colors ${
                            timerRunning
                              ? "bg-amber-700 hover:bg-amber-600 text-white"
                              : "bg-green-700 hover:bg-green-600 text-white"
                          }`}
                        >
                          {timerRunning ? "⏸ Pause" : "▶ Resume"}
                        </button>
                        <button
                          onClick={handleTimerReset}
                          className="font-[family-name:var(--font-mono)] text-sm px-5 py-2.5 rounded font-semibold tracking-wider uppercase bg-[#3A2818] hover:bg-[#4A3828] text-[#F0E6D3]/70 hover:text-[#F0E6D3] transition-colors"
                        >
                          ↺ Reset
                        </button>
                      </>
                    )}
                    {nextStatus && !isLive && (
                      <button
                        onClick={() => handleStatusChange(nextStatus.status)}
                        className={`font-[family-name:var(--font-mono)] text-sm px-6 py-2.5 rounded font-semibold tracking-wider uppercase transition-colors ${
                          nextStatus.status === "live"
                            ? "bg-green-700 hover:bg-green-600 text-white animate-pulse"
                            : nextStatus.status === "published"
                            ? "bg-purple-700 hover:bg-purple-600 text-white"
                            : "bg-[#D4A843] hover:bg-[#E89B2E] text-[#1A0F0A]"
                        }`}
                      >
                        {nextStatus.label}
                      </button>
                    )}
                    {!nextStatus && !isLive && (
                      <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs">
                        Episode finalized
                      </span>
                    )}
                  </div>
                </div>

                {/* Assign panel (expandable) */}
                {showAssignPanel && (
                  <div className="flex items-end gap-3 mt-4 pt-4 border-t border-[#3A2818]">
                    <div className="flex-1">
                      <label className="font-[family-name:var(--font-mono)] text-xs text-[#F0E6D3]/50 uppercase tracking-wider block mb-1">
                        Select Submission
                      </label>
                      <select
                        value={selectedSubmissionId}
                        onChange={(e) => setSelectedSubmissionId(e.target.value)}
                        className="w-full bg-[#1A0F0A] border border-[#3A2818] rounded px-3 py-2 text-[#F0E6D3] font-[family-name:var(--font-mono)] text-sm focus:border-[#D4A843]/50 focus:outline-none"
                      >
                        <option value="">Choose a submission...</option>
                        {assignable.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.track_title || "Untitled"} ({getGenreLabel(s.genre)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAssign}
                      disabled={!selectedSubmissionId || assigning === selectedSubmissionId}
                      className="font-[family-name:var(--font-mono)] text-sm text-[#1A0F0A] bg-[#D4A843] hover:bg-[#E89B2E] transition-colors px-4 py-2 rounded disabled:opacity-30 font-semibold"
                    >
                      {assigning === selectedSubmissionId ? "Assigning..." : "Assign"}
                    </button>
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════
                  ALL SUBMISSIONS (scrollable)
                  ═══════════════════════════════════════════════ */}
              <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden mb-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg text-[#D4A843] uppercase tracking-[0.15em] font-bold mb-4">
                  Submissions
                  <span className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-xs ml-2 normal-case tracking-normal">
                    {availableSubmissions.length} total · {assignable.length} available
                  </span>
                </h2>
                {availableSubmissions.length === 0 ? (
                  <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                    No submissions yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {availableSubmissions.map((s) => {
                      const isAssigned = contestants.some((c) => c.id === s.id);
                      return (
                        <div
                          key={s.id}
                          className={`flex items-center gap-4 px-4 py-3 rounded border transition-colors ${
                            isAssigned
                              ? "border-[#D4A843]/20 bg-[#D4A843]/5"
                              : "border-[#3A2818] bg-[#1A0F0A]/50"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3] text-sm font-medium truncate">
                              {s.name}
                              {isAssigned && <span className="text-[#D4A843]/60 text-xs ml-2">✓ queued</span>}
                            </p>
                            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-xs truncate">
                              {s.track_title || "Untitled"} · {getGenreLabel(s.genre)}
                            </p>
                          </div>
                          <StatusBadge status={s.status} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ═══════════════════════════════════════════════
                  LIVE CONTROL SURFACE (ready + live)
                  ═══════════════════════════════════════════════ */}
              {controlsEnabled && (
                <>
                  <PreFlightCheck
                    wsConnected={connected}
                    overlayCount={null}
                    contestantsConfirmed={contestantsConfirmed}
                    contestantsTotal={contestants.length}
                    allTracksLoaded={allTracksLoaded}
                    episodeStatus={episode.status}
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ContestantQueue
                      contestants={contestants}
                      activeIndex={activeContestantIndex}
                      onActivate={handleActivateContestant}
                    />
                    <div className="space-y-6">
                      <SegmentControl
                        currentSegment={currentSegment}
                        segmentHistory={segmentHistory}
                        onSegmentChange={handleSegmentChange}
                        disabled={!isLive}
                      />
                      <Timer
                        seconds={timerSeconds}
                        isRunning={timerRunning}
                        onStart={handleTimerStart}
                        onStop={handleTimerStop}
                        onReset={handleTimerReset}
                      />
                      <AudioControls
                        currentTrack={currentTrack}
                        isPlaying={isPlaying}
                        onPlay={handlePlay}
                        onPause={handlePause}
                        onPushToViewers={handlePushToViewers}
                        volume={volume}
                        onVolumeChange={handleVolumeChange}
                      />
                      <audio ref={audioRef} preload="none" />
                    </div>
                  </div>

                  <div className="mt-6">
                    <LiveScores
                      hostMetrics={hostMetrics}
                      viewerMetrics={viewerMetrics}
                      viewerVotes={viewerVotes}
                      onLockScore={handleLockScore}
                      onCloseVoting={handleCloseVoting}
                      locked={scoreLocked}
                      votingClosed={votingClosed}
                    />
                  </div>

                  <QuickActions
                    onGoToBreak={handleGoToBreak}
                    onActivateBackup={handleActivateBackup}
                    onSkipContestant={handleSkipContestant}
                    onResetEpisode={handleResetEpisode}
                    onEndShow={handleEndShow}
                    isOnBreak={isOnBreak}
                    hasBackup={hasBackup}
                    currentSegment={currentSegment}
                  />
                </>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
