import { createElement, forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";
import { View } from "react-native";

let youtubeApiPromise: Promise<any> | undefined;

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYoutubeApi(): Promise<any> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube API requires a browser"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") previous();
      resolve(window.YT);
    };
    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
    }
    if (window.YT?.Player) resolve(window.YT);
  });
  return youtubeApiPromise;
}

const STATE_MAP: Record<string, string> = {
  "-1": "unstarted",
  "0": "ended",
  "1": "playing",
  "2": "paused",
  "3": "buffering",
  "5": "video cued",
};

export interface YoutubePlayerWebProps {
  height?: number;
  videoId: string;
  play?: boolean;
  onReady?: () => void;
  onChangeState?: (state: string) => void;
}

export interface YoutubePlayerWebRef {
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => Promise<number>;
}

const YoutubePlayer = forwardRef<YoutubePlayerWebRef, YoutubePlayerWebProps>(
  function YoutubePlayer(
    { height = 220, videoId, play = false, onReady, onChangeState },
    ref
  ) {
    const hostId = `yt${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
    const playerRef = useRef<any>(null);
    const playRef = useRef(play);
    const onReadyRef = useRef(onReady);
    const onChangeStateRef = useRef(onChangeState);
    playRef.current = play;
    onReadyRef.current = onReady;
    onChangeStateRef.current = onChangeState;

    useImperativeHandle(ref, () => ({
      seekTo(seconds: number, allowSeekAhead = true) {
        try {
          playerRef.current?.seekTo?.(Number(seconds) || 0, allowSeekAhead);
        } catch {
          /* ignore */
        }
      },
      getCurrentTime(): Promise<number> {
        try {
          return Promise.resolve(Number(playerRef.current?.getCurrentTime?.() || 0));
        } catch {
          return Promise.resolve(0);
        }
      },
    }));

    useEffect(() => {
      if (!videoId) return undefined;
      let cancelled = false;
      let player: any;
      loadYoutubeApi()
        .then((YT) => {
          if (cancelled) return;
          player = new YT.Player(hostId, {
            videoId,
            height: String(height),
            width: "100%",
            playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: () => {
                playerRef.current = player;
                onReadyRef.current?.();
                if (playRef.current) player.playVideo();
              },
              onStateChange: (event: any) => {
                onChangeStateRef.current?.(STATE_MAP[String(event.data)] || "unstarted");
              },
            },
          });
          playerRef.current = player;
        })
        .catch(() => {});
      return () => {
        cancelled = true;
        try {
          player?.destroy?.();
        } catch {
          /* ignore */
        }
        playerRef.current = null;
      };
    }, [videoId, height, hostId]);

    useEffect(() => {
      const player = playerRef.current;
      if (!player?.playVideo) return;
      try {
        if (play) player.playVideo();
        else player.pauseVideo();
      } catch {
        /* ignore */
      }
    }, [play]);

    return (
      <View style={{ height, width: "100%", backgroundColor: "#000" }}>
        {createElement("div", { id: hostId, style: { width: "100%", height } })}
      </View>
    );
  }
);

export default YoutubePlayer;
