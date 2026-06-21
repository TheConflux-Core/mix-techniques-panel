"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "wss://ws.mixtechniques.com";

export type WSMessage = { type: string; data: Record<string, unknown> };

export function useOverlaySocket(onMessage?: (msg: WSMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(() => {
    if (wsRef.current) return;

    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      if (reconnectRef.current) {
        clearTimeout(reconnectRef.current);
        reconnectRef.current = null;
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      wsRef.current = null;
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current || !onMessageRef.current) return;
      try {
        const msg = JSON.parse(evt.data) as WSMessage;
        onMessageRef.current(msg);
      } catch { /* ignore malformed */ }
    };

    wsRef.current = ws;
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectRef.current || !mountedRef.current) return;
    reconnectRef.current = setTimeout(() => {
      reconnectRef.current = null;
      connect();
    }, 3000);
  }, [connect]);

  const sendMessage = useCallback(
    (type: string, data: Record<string, unknown>) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return false;
      ws.send(JSON.stringify({ type, data }));
      return true;
    },
    []
  );

  /** Push contestant data to all overlays */
  const pushContestant = useCallback(
    (contestant: {
      name: string;
      city?: string;
      genre?: string;
      handle?: string;
      trackTitle?: string;
    }) => {
      return sendMessage("contestant-update", {
        name: contestant.name,
        city: contestant.city || "",
        genre: contestant.genre || "",
        handle: contestant.handle || "",
      });
    },
    [sendMessage]
  );

  /** Push track info to overlays */
  const pushTrack = useCallback(
    (track: { title: string; artist?: string; url?: string }) => {
      return sendMessage("track-update", {
        title: track.title,
        artist: track.artist || "",
        url: track.url || "",
      });
    },
    [sendMessage]
  );

  /** Change the active segment */
  const pushSegment = useCallback(
    (segment: string) => {
      return sendMessage("segment-change", { segment });
    },
    [sendMessage]
  );

  /** Reset for next contestant */
  const pushNextContestant = useCallback(() => {
    return sendMessage("next-contestant", {});
  }, [sendMessage]);

  /** Update episode number */
  const pushEpisode = useCallback(
    (episode: number) => {
      return sendMessage("episode-update", { episode });
    },
    [sendMessage]
  );

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  /** Push episode status change */
  const pushEpisodeStatus = useCallback(
    (status: string) => {
      return sendMessage("episode-status", { status });
    },
    [sendMessage]
  );

  /** Push score update to overlays */
  const pushScoreUpdate = useCallback(
    (metrics: Record<string, number>, total: number) => {
      return sendMessage("score-update", { metrics, total });
    },
    [sendMessage]
  );

  /** Lock current scores */
  const pushLockScore = useCallback(() => {
    return sendMessage("lock-score", {});
  }, [sendMessage]);

  /** Push track play event to viewers */
  const pushPlayTrack = useCallback(
    (track: { url: string; title: string; artist: string }) => {
      return sendMessage("play-track", track);
    },
    [sendMessage]
  );

  /** Push track pause event to viewers */
  const pushPauseTrack = useCallback(() => {
    return sendMessage("pause-track", {});
  }, [sendMessage]);

  /** Push track seek event to viewers */
  const pushSeekTrack = useCallback(
    (position: number) => {
      return sendMessage("seek-track", { position });
    },
    [sendMessage]
  );

  /** Trigger pull animation on overlay (name hidden) */
  const pushPullStart = useCallback(
    (poolSize: number) => {
      return sendMessage("pull-start", { poolSize });
    },
    [sendMessage]
  );

  /** Announce pulled contestant on overlay (name revealed) */
  const pushPullAnnounce = useCallback(
    (contestant: { name: string; city?: string; genre?: string; trackTitle?: string }) => {
      return sendMessage("pull-announce", {
        name: contestant.name,
        city: contestant.city || "",
        genre: contestant.genre || "",
        trackTitle: contestant.trackTitle || "",
      });
    },
    [sendMessage]
  );

  return {
    connected,
    sendMessage,
    pushContestant,
    pushTrack,
    pushSegment,
    pushNextContestant,
    pushEpisode,
    pushEpisodeStatus,
    pushScoreUpdate,
    pushLockScore,
    pushPlayTrack,
    pushPauseTrack,
    pushSeekTrack,
    pushPullStart,
    pushPullAnnounce,
  };
}
