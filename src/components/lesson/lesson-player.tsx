"use client";

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { MessageCircleQuestionIcon, PauseIcon, PlayIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatTime } from "@/lib/format";
import type { Lesson } from "@/mastra/schemas";

const MUSIC_VOLUME = 0.12;
/** Before playback starts, show a moment where the first scene is already on screen. */
const POSTER_TIME = 1.5;

/** The stage iframe renders whatever moment of the timeline we tell it to. */
function seekStage(frame: HTMLIFrameElement | null, time: number) {
  frame?.contentWindow?.postMessage({ type: "seek", time }, "*");
}

export type LessonPlayerHandle = { play: () => void };

type LessonPlayerProps = {
  lesson: Lesson;
  /** Pauses the lesson and hands over the moment the learner wants to ask about. */
  onAsk?: (time: number) => void;
  /** Questions already asked in this lesson. */
  questionCount?: number;
  onEnded?: () => void;
  ref?: Ref<LessonPlayerHandle>;
};

export function LessonPlayer({ lesson, onAsk, questionCount = 0, onEnded, ref }: LessonPlayerProps) {
  const { id, video } = lesson;
  const frameRef = useRef<HTMLIFrameElement>(null);
  const voiceRef = useRef<HTMLAudioElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [time, setTime] = useState(0);

  // While playing, the narration is the clock and the stage follows it.
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const now = voiceRef.current?.currentTime ?? 0;
      setTime(now);
      seekStage(frameRef.current, now);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  // Bring the stage to the current moment whenever it (re)loads. The stage may
  // also finish loading before hydration, so sync once on mount as well.
  useEffect(() => {
    const syncNow = () => {
      const now = voiceRef.current?.currentTime ?? 0;
      seekStage(frameRef.current, now > 0 ? now : POSTER_TIME);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.source === frameRef.current?.contentWindow && event.data?.type === "stage-ready") {
        syncNow();
      }
    };
    window.addEventListener("message", onMessage);
    syncNow();
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useImperativeHandle(ref, () => ({
    play: () => {
      setStarted(true);
      void voiceRef.current?.play();
    },
  }));

  function ask() {
    const voice = voiceRef.current;
    voice?.pause();
    onAsk?.(voice?.currentTime ?? 0);
  }

  function togglePlay() {
    const voice = voiceRef.current;
    if (!voice) return;
    setStarted(true);
    if (voice.paused) void voice.play();
    else voice.pause();
  }

  function seek(to: number) {
    if (voiceRef.current) voiceRef.current.currentTime = to;
    if (musicRef.current) musicRef.current.currentTime = to;
    setTime(to);
    seekStage(frameRef.current, to);
  }

  const activeScene = video.scenes.findLast((scene) => time >= scene.start);

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-card relative aspect-video overflow-hidden rounded-2xl border shadow-sm">
        <iframe
          ref={frameRef}
          title={`${lesson.title} animation`}
          src={`/api/lessons/${id}/stage`}
          sandbox="allow-scripts"
          className="absolute inset-0 size-full"
        />
        {!started && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label="Start the lesson"
            className="group bg-foreground/5 absolute inset-0 flex items-center justify-center"
          >
            <span className="bg-primary text-primary-foreground flex size-18 items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-105">
              <PlayIcon className="size-7 translate-x-0.5 fill-current" />
            </span>
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="icon"
          variant="secondary"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </Button>
        <Slider
          value={[time]}
          max={video.duration}
          step={0.1}
          onValueChange={(value) => seek(Array.isArray(value) ? value[0] : value)}
          aria-label="Seek"
        />
        <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
          {formatTime(time)} / {formatTime(video.duration)}
        </span>
        {onAsk && (
          <Button variant="outline" onClick={ask}>
            <MessageCircleQuestionIcon data-icon="inline-start" />
            Ask
            {questionCount > 0 && (
              <Badge variant="secondary" className="ms-0.5 tabular-nums">
                {questionCount}
              </Badge>
            )}
          </Button>
        )}
      </div>

      <ol className="flex flex-wrap gap-1.5" aria-label="Chapters">
        {video.scenes.map((scene, index) => (
          <li key={scene.id}>
            <Button
              size="sm"
              variant={scene.id === activeScene?.id ? "secondary" : "ghost"}
              // Audio rounds currentTime down a hair, so land just inside the chapter.
              onClick={() => seek(scene.start + 0.01)}
            >
              <span className="text-muted-foreground tabular-nums">{index + 1}</span>
              {scene.title}
            </Button>
          </li>
        ))}
      </ol>

      <audio
        ref={voiceRef}
        src={`/api/lessons/${id}/narration.mp3`}
        preload="auto"
        onPlay={() => {
          setPlaying(true);
          const music = musicRef.current;
          if (music && voiceRef.current) {
            music.currentTime = voiceRef.current.currentTime;
            void music.play().catch(() => {});
          }
        }}
        onPause={() => {
          setPlaying(false);
          musicRef.current?.pause();
        }}
        onEnded={onEnded}
      />
      {video.hasMusic && (
        <audio
          ref={musicRef}
          src={`/api/lessons/${id}/music.mp3`}
          preload="auto"
          onLoadedMetadata={(event) => {
            event.currentTarget.volume = MUSIC_VOLUME;
          }}
        />
      )}
    </div>
  );
}
