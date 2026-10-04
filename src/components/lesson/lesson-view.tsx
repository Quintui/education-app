"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { UIMessage } from "ai";
import { motion } from "motion/react";
import { BookOpenIcon, CircleHelpIcon, ShapesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatTime } from "@/lib/format";
import { EASE_OUT } from "@/lib/motion";
import type { Lesson } from "@/mastra/schemas";
import { AskTutor } from "./ask-tutor";
import { LessonNotes } from "./lesson-notes";
import { LessonPlayer, type LessonPlayerHandle } from "./lesson-player";
import { LessonQuiz } from "./lesson-quiz";

/** Header, player and materials arrive one after another. */
const section = (order: number) => ({
  initial: { opacity: 0, y: 12, filter: "blur(6px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  transition: { duration: 0.5, delay: order * 0.1, ease: EASE_OUT },
});

type LessonViewProps = { lesson: Lesson; askHistory: UIMessage[] };

/** Progress is a fire-and-forget record; the refresh updates the course map. */
async function reportProgress(body: Record<string, unknown>) {
  await fetch("/api/progress", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function LessonView({ lesson, askHistory }: LessonViewProps) {
  const router = useRouter();
  const playerRef = useRef<LessonPlayerHandle>(null);
  // The moment the learner paused to ask about, or null while just watching.
  const [askAt, setAskAt] = useState<number | null>(null);

  return (
    <article className="flex flex-col gap-6">
      <motion.header {...section(0)} className="flex flex-col gap-2">
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary" className="capitalize">
            {lesson.level}
          </Badge>
          <span>
            {lesson.video.scenes.length} chapters · {formatTime(lesson.video.duration)}
          </span>
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{lesson.title}</h2>
        <p className="text-muted-foreground text-lg text-pretty">{lesson.hook}</p>
      </motion.header>

      <motion.div {...section(1)} className="flex flex-col gap-4">
        <LessonPlayer
          ref={playerRef}
          lesson={lesson}
          questionCount={askHistory.filter((m) => m.role === "user").length}
          onAsk={setAskAt}
          onEnded={() => reportProgress({ event: "watched", lessonId: lesson.id }).then(() => router.refresh())}
        />
        <AskTutor
          lesson={lesson}
          history={askHistory}
          time={askAt}
          onClose={() => setAskAt(null)}
          onResume={() => {
            setAskAt(null);
            playerRef.current?.play();
          }}
        />
      </motion.div>

      <motion.div {...section(2)}>
        <Tabs defaultValue="notes" className="gap-4">
          <TabsList>
            <TabsTrigger value="notes">
              <BookOpenIcon data-icon="inline-start" />
              Notes
            </TabsTrigger>
            <TabsTrigger value="quiz">
              <CircleHelpIcon data-icon="inline-start" />
              Quiz
            </TabsTrigger>
            {lesson.hasPlayground && (
              <TabsTrigger value="playground">
                <ShapesIcon data-icon="inline-start" />
                Playground
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="notes">
            <LessonNotes notes={lesson.notes} />
          </TabsContent>
          <TabsContent value="quiz">
            <LessonQuiz
              questions={lesson.quiz}
              onComplete={(correct, total) =>
                reportProgress({ event: "quiz", lessonId: lesson.id, correct, total })
              }
            />
          </TabsContent>
          {lesson.hasPlayground && (
            <TabsContent value="playground">
              <iframe
                title={`${lesson.title} playground`}
                src={`/api/lessons/${lesson.id}/playground`}
                sandbox="allow-scripts"
                className="bg-card h-130 w-full rounded-2xl border shadow-sm"
              />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </article>
  );
}
