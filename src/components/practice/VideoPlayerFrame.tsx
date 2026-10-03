import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Play, RotateCcw } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import type { YoutubeIframeRef } from "react-native-youtube-iframe";
import YoutubePlayer from "./YoutubePlayer";

interface Props {
  videoId: string;
  thumbnail?: string;
  startSeconds: number;
  play: boolean;
  onPlay: () => void;
  onReady: () => void;
  onReset: () => void;
  onChangeState: (state: string) => void;
}

// Keep the iframe mounted while its poster is visible. Ready means API-ready;
// only a playing event confirms that the first playback has begun.
const VideoPlayerFrame = forwardRef<YoutubeIframeRef, Props>(function VideoPlayerFrame(
  { videoId, thumbnail, startSeconds, play, onPlay, onReady, onReset, onChangeState }, ref,
) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const callbacks = useRef({ onReset });
  callbacks.current = { onReset };
  const fail = useCallback(() => {
    setFailed(true);
    callbacks.current.onReset();
  }, []);

  useEffect(() => {
    if (failed || (ready && (!play || started))) return;
    const timer = setTimeout(fail, 20000);
    return () => clearTimeout(timer);
  }, [attempt, fail, failed, play, ready, started]);

  const waiting = !ready || play;
  return (
    <View style={{ height: 205, backgroundColor: "#1e293b" }}>
      {!failed ? <YoutubePlayer
        key={attempt}
        ref={ref}
        height={205}
        videoId={videoId}
        play={play}
        initialPlayerParams={{ start: Math.max(0, Math.floor(startSeconds)) }}
        onReady={() => { setReady(true); onReady(); }}
        onError={fail}
        webViewProps={{ onError: fail, onHttpError: fail }}
        onChangeState={(state: string) => {
          if (state === "playing") setStarted(true);
          onChangeState(state);
        }}
      /> : null}
      {!started || failed ? (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "#1e293b" }]}>
          <Image
            source={{ uri: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(15, 23, 42, 0.45)", alignItems: "center", justifyContent: "center", padding: 16 }]}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={failed ? t("common.retry") : t("videos.practice.replaySentence")}
              accessibilityState={{ busy: !failed && waiting, disabled: !failed && play }}
              disabled={!failed && play}
              onPress={() => {
                if (failed) {
                  onReset(); setReady(false); setStarted(false); setFailed(false); setAttempt(value => value + 1);
                } else onPlay();
              }}
              style={{ minHeight: 48, minWidth: 48, padding: 12, borderRadius: 28, backgroundColor: "#2383E2", alignItems: "center", justifyContent: "center" }}
            >
              {failed ? <RotateCcw size={24} color="#fff" /> : waiting ? <ActivityIndicator color="#fff" /> : <Play size={24} color="#fff" fill="#fff" />}
            </TouchableOpacity>
            <Text style={{ marginTop: 12, fontSize: 14, fontWeight: "600", color: "#fff", textAlign: "center" }}>
              {failed ? t("videos.practice.playerLoadFailed") : waiting ? t("videos.practice.loading") : t("videos.practice.replaySentence")}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
});

export default VideoPlayerFrame;
