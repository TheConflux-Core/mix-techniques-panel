"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Episode, Submission } from "@/lib/types";
import Navbar from "@/components/Navbar";
import EpisodeHeader from "@/components/show-runner/EpisodeHeader";
import ContestantQueue from "@/components/show-runner/ContestantQueue";
import SegmentControl from "@/components/show-runner/SegmentControl";
import Timer from "@/components/show-runner/Timer";
import LiveScores, { type MetricScores } from "@/components/show-runner/LiveScores";
import AudioControls from "@/components/show-runner/AudioControls";
import PreFlightCheck from "@/components/show-runner/PreFlightCheck";
import QuickActions from "@/components/show-runner/QuickActions";
import { useOverlaySocket } from "@/lib/useOverlaySocket";

export default function StandbyClient() {
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [contestants, setContestants] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContestantIndex, setActiveContestantIndex] = useState(0);

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
  const [metricVotes, setMetricVotes] = useState<Record<string, number>>({});
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
  const router = useRouter();
  const supabase = createClient();
  const { connected, sendMessage, pushSegment, pushContestant, pushTrack, pushEpisode, pushEpisodeStatus, pushScoreUpdate, pushLockScore, pushPlayTrack, pushPauseTrack } = useOverlaySocket();

  const isLive = episode?.status === "live";
  const isReady = episode?.status === "ready";
  const controlsEnabled = isLive || isReady;

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerRunning]);

  const fetchEpisode = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }

      const res = await fetch("/api/episodes", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const active = data.find((e: Episode) => ["live", "ready"].includes(e.status));
        if (active) {
          setEpisode(active);
          fetchContestants(active.id, session.access_token);
        }
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const fetchContestants = useCallback(async (episodeId: string, token: string) => {
    try {
      const res = await fetch(`/api/episodes/${episodeId}/contestants`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setContestants(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchEpisode();
  }, [fetchEpisode]);

  const handleSegmentChange = useCallback((segment: string) => {
    setCurrentSegment(segment);
    setSegmentHistory((prev) => {
      if (prev.includes(segment)) return prev;
      return [...prev, segment];
    });
    pushSegment(segment);
    setTimerSeconds(0);
    setTimerRunning(false);
  }, [pushSegment]);

  const handleActivateContestant = useCallback((index: number) => {
    setActiveContestantIndex(index);
    setHostMetrics({ ...emptyMetrics });
    setScoreLocked(false);
    setVotingClosed(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
    setCurrentTrack(null);
    const c = contestants[index];
    if (c) {
      pushContestant({
        name: c.name,
        city: c.location || "",
        genre: c.genre || "",
        handle: c.social_links?.instagram || "",
      });
      if (c.track_title) {
        pushTrack({ title: c.track_title, artist: c.name });
      }
      if (c.track_signed_url) {
        setCurrentTrack({ title: c.track_title || "", artist: c.name, url: c.track_signed_url });
      }
    }
  }, [contestants, pushContestant, pushTrack]);

  const handleTimerStart = useCallback(() => setTimerRunning(true), []);
  const handleTimerStop = useCallback(() => setTimerRunning(false), []);
  const handleTimerReset = useCallback(() => {
    setTimerRunning(false);
    setTimerSeconds(0);
  }, []);

  const handleLockScore = useCallback(() => {
    setScoreLocked(true);
    pushLockScore();
  }, [pushLockScore]);

  const handleCloseVoting = useCallback(() => {
    setVotingClosed(true);
    pushSegment("VERDICT");
  }, [pushSegment]);

  const handlePlay = useCallback(() => {
    if (audioRef.current && currentTrack?.url) {
      audioRef.current.src = currentTrack.url;
      audioRef.current.play();
      setIsPlaying(true);
      pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
    }
  }, [currentTrack, pushPlayTrack]);

  const handlePause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
      pushPauseTrack();
    }
  }, [pushPauseTrack]);

  const handlePushToViewers = useCallback(() => {
    if (currentTrack) {
      pushPlayTrack({ url: currentTrack.url, title: currentTrack.title, artist: currentTrack.artist });
    }
  }, [currentTrack, pushPlayTrack]);

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  }, []);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!episode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEpisode(updated);
        pushEpisodeStatus(newStatus);
      }
    } catch { /* silent */ }
  }, [episode, pushEpisodeStatus]);

  // Phase 4: Quick action handlers
  const hasBackup = contestants.some((c) => c.pull_order === 4);
  const contestantsConfirmed = contestants.filter((c) => c.status === "selected" || c.status === "aired").length;
  const allTracksLoaded = contestants.length > 0 && contestants.every((c) => c.track_url);

  const handleGoToBreak = useCallback(() => {
    if (isOnBreak) {
      setIsOnBreak(false);
      handleSegmentChange(previousSegment);
    } else {
      setPreviousSegment(currentSegment);
      setIsOnBreak(true);
      handleSegmentChange("BREAK");
    }
  }, [isOnBreak, previousSegment, currentSegment, handleSegmentChange]);

  const handleActivateBackup = useCallback(() => {
    const backupIdx = contestants.findIndex((c) => c.pull_order === 4);
    if (backupIdx === -1) return;
    const updated = [...contestants];
    const currentContestant = updated[activeContestantIndex];
    const backupContestant = updated[backupIdx];
    if (currentContestant && backupContestant) {
      const tmpOrder = currentContestant.pull_order;
      currentContestant.pull_order = backupContestant.pull_order;
      backupContestant.pull_order = tmpOrder;
      setContestants(updated);
      handleActivateContestant(backupIdx);
    }
  }, [contestants, activeContestantIndex, handleActivateContestant]);

  const handleSkipContestant = useCallback(() => {
    if (!window.confirm("Skip this contestant and move to next?")) return;
    const nextIdx = activeContestantIndex + 1;
    if (nextIdx < contestants.length) {
      handleActivateContestant(nextIdx);
    }
  }, [activeContestantIndex, contestants.length, handleActivateContestant]);

  const handleResetEpisode = useCallback(() => {
    if (!window.confirm("Reset all scores and votes for this episode?")) return;
    sendMessage("reset-episode", {});
    setHostMetrics({ ...emptyMetrics });
    setViewerMetrics({ ...emptyMetrics });
    setViewerVotes(0);
    setMetricVotes({});
    setScoreLocked(false);
    setVotingClosed(false);
  }, [sendMessage]);

  const handleEndShow = useCallback(async () => {
    if (!window.confirm("End the show? This will stop the timer and close voting.")) return;
    if (!episode) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch(`/api/episodes/${episode.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: "post_production" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setEpisode(updated);
        setTimerRunning(false);
        pushEpisodeStatus("post_production");
      }
    } catch { /* silent */ }
  }, [episode, pushEpisodeStatus]);

  return (
    <div className="flex flex-col min-h-screen relative">
      <div className="fixed inset-0 carbon-fiber pointer-events-none" />
      <div className="fixed inset-0 warm-light-bg pointer-events-none opacity-50" />
      <Navbar />
      <main className="flex-1 px-4 py-8">
        <div className="max-w-7xl mx-auto">

          {/* Standby Header */}
          <div className="text-center mb-10">
            <h1 className="font-[family-name:var(--font-display)] text-5xl text-[#D4A843] uppercase tracking-[0.25em] font-bold gold-shimmer mb-3">
              Standby
            </h1>
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/40 text-sm uppercase tracking-[0.2em]">
              STUDIO GOLD • Ep.{episode ? String(episode.episode_number).padStart(2, "0") : "—"}
            </p>
            <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/25 text-xs mt-2 uppercase tracking-wider">
              Ready to broadcast
            </p>
          </div>

          {/* Content */}
          {loading ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                Loading...
              </p>
            </div>
          ) : !episode ? (
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center py-8">
                No active episode found.{" "}
                <button onClick={() => router.push("/show-runner")} className="text-[#D4A843] hover:underline">
                  Go to Show Runner
                </button>
              </p>
            </div>
          ) : controlsEnabled ? (
            <>
              {/* Episode Header */}
              <EpisodeHeader
                episode={episode}
                contestants={contestants}
                isLive={isLive || isReady}
                timerSeconds={timerSeconds}
              />

              {/* Pre-flight status bar */}
              <PreFlightCheck
                wsConnected={connected}
                overlayCount={null}
                contestantsConfirmed={contestantsConfirmed}
                contestantsTotal={contestants.length}
                allTracksLoaded={allTracksLoaded}
                episodeStatus={episode.status}
              />

              {/* Two-column layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Contestant Queue */}
                <ContestantQueue
                  contestants={contestants}
                  activeIndex={activeContestantIndex}
                  onActivate={handleActivateContestant}
                />

                {/* Right: Segments + Timer + Audio */}
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

              {/* Live Scores — full width */}
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

              {/* Quick Actions — full width */}
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
          ) : (
            /* Episode exists but not in controls-enabled state */
            <div className="card-float noise carbon-fiber-walnut rounded-xl p-6 relative overflow-hidden">
              <EpisodeHeader
                episode={episode}
                contestants={contestants}
                isLive={false}
                timerSeconds={0}
              />
              <div className="flex flex-col items-center gap-4 py-4">
                <p className="font-[family-name:var(--font-mono)] text-[#F0E6D3]/30 text-sm text-center">
                  Episode is in <span className="text-[#D4A843]">{episode.status}</span> status.
                </p>
                <div className="flex items-center gap-3">

                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
