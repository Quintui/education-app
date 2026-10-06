"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckIcon,
  CircleHelpIcon,
  ClapperboardIcon,
  ClockIcon,
  LightbulbIcon,
  NotebookPenIcon,
  RotateCcwIcon,
  ShapesIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";
import type { WorkflowDataPart } from "@mastra/ai-sdk";
import { ShimmerLabel } from "@/components/assistant-ui/elements/surfaces";
import { StreamStatus, Waveform } from "@/components/streaming";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { appear, appearSmall, EASE_OUT, springy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Lesson, LessonPlan, MaterialProgress, SceneProgress } from "@/mastra/schemas";

type WorkflowData = WorkflowDataPart["data"];
type StepStatus = "pending" | "running" | "success" | "failed";

/** Everything the lesson workflow has streamed so far, read from the message parts. */
function readProgress(parts: UIMessage["parts"]) {
  let workflow: WorkflowData | undefined;
  let lesson: Lesson | undefined;
  let plan: LessonPlan | undefined;
  const scenes = new Map<string, SceneProgress["status"]>();
  const materials = new Map<MaterialProgress["kind"], MaterialProgress["status"]>();

  for (const part of parts) {
    if (part.type === "data-workflow") workflow = part.data as WorkflowData;
    if (part.type === "data-lesson") lesson = part.data as Lesson;
    if (part.type === "data-plan") plan = part.data as LessonPlan;
    if (part.type === "data-scene") {
      const scene = part.data as SceneProgress;
      scenes.set(scene.sceneId, scene.status);
    }
    if (part.type === "data-material") {
      const material = part.data as MaterialProgress;
      materials.set(material.kind, material.status);
    }
  }

  const step = (id: string): StepStatus => {
    const status = workflow?.steps[id]?.status;
    return status === "running" || status === "success" || status === "failed" ? status : "pending";
  };

  return { workflow, lesson, scenes, materials, step, plan };
}

function useElapsedSeconds(running: boolean) {
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(startedAt);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return Math.floor((now - startedAt) / 1000);
}

type LessonBuilderProps = { courseId: string; nodeId: string; title: string; goal: string };

export function LessonBuilder({ courseId, nodeId, title, goal }: LessonBuilderProps) {
  const router = useRouter();
  const [transport] = useState(
    () => new DefaultChatTransport({ api: "/api/lesson", body: { courseId, nodeId } }),
  );
  const { messages, sendMessage, setMessages, status } = useChat({ transport });

  // Opening a lesson that is not built yet starts building it. Deferred and
  // cancelled on cleanup, so Strict Mode's mount/unmount/mount sends exactly once.
  useEffect(() => {
    const timer = setTimeout(() => void sendMessage({ text: "Build this lesson" }), 0);
    return () => clearTimeout(timer);
  }, [sendMessage]);

  const parts = messages.findLast((m) => m.role === "assistant")?.parts ?? [];
  const progress = readProgress(parts);
  const { lesson, plan, scenes, materials, step } = progress;

  // The lesson is saved: let the server render it and update the course map.
  useEffect(() => {
    if (lesson) router.refresh();
  }, [lesson, router]);

  const failed = status === "error" || progress.workflow?.status === "failed";
  const running = !lesson && !failed;
  const elapsed = useElapsedSeconds(running);

  function retry() {
    setMessages([]);
    void sendMessage({ text: "Build this lesson" });
  }

  const sceneList = plan?.scenes ?? [];
  const readyScenes = sceneList.filter((s) => scenes.get(s.id) === "ready").length;
  const readyMaterials = [...materials.values()].filter((s) => s === "ready").length;
  const percent =
    (step("plan-lesson") === "success" ? 15 : 0) +
    (step("video-workflow") === "success" ? 55 : sceneList.length ? (readyScenes / sceneList.length) * 50 : 0) +
    (readyMaterials / 3) * 20 +
    (step("finalize-lesson") === "success" ? 10 : 0);

  return (
    <motion.div {...appear}>
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <Badge variant="secondary">
                <SparklesIcon data-icon="inline-start" />
                {lesson ? "Your lesson is ready" : "Building your lesson"}
              </Badge>
              <AnimatePresence mode="wait" initial={false}>
                <motion.h2
                  key={plan?.title ?? title}
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: EASE_OUT }}
                  className="text-2xl font-bold tracking-tight text-balance sm:text-3xl"
                >
                  {plan?.title ?? title}
                </motion.h2>
              </AnimatePresence>
              <p className="text-muted-foreground text-pretty">{plan?.hook ?? goal}</p>
            </div>
            <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
              <ClockIcon className="size-3.5" />
              {formatTime(elapsed)}
            </span>
          </div>

          {failed ? (
            <Alert variant="destructive">
              <AlertTitle>This lesson could not be built</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
                Something went wrong along the way. It usually works on a second try.
                <Button variant="outline" size="sm" onClick={retry}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : (
            <div className="flex flex-col gap-2">
              <Progress value={percent} aria-label="Lesson progress" />
              {lesson ? (
                <span className="text-primary flex items-center gap-1.5 text-sm font-medium">
                  <CheckIcon className="size-4" /> Opening your lesson…
                </span>
              ) : (
                <StreamStatus label={phaseLabel(progress, readyScenes, sceneList.length)} />
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          <ol className="flex flex-col">
            <Step icon={LightbulbIcon} title="Planning the lesson" status={step("plan-lesson")}>
              {step("plan-lesson") === "running" && (
                <ShimmerLabel className="text-muted-foreground text-sm">
                  Choosing the core idea and writing the narration
                </ShimmerLabel>
              )}
              {plan && (
                <motion.div {...appear} className="bg-highlight/25 rounded-xl px-4 py-3 text-sm leading-relaxed">
                  <span className="text-highlight-foreground font-medium">The big idea: </span>
                  {plan.coreIntuition}
                </motion.div>
              )}
            </Step>

            <Step icon={ClapperboardIcon} title="Recording and animating" status={step("video-workflow")}>
              {sceneList.length > 0 && (
                <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {sceneList.map((scene, index) => (
                    <SceneCard key={scene.id} index={index} title={scene.title} status={scenes.get(scene.id)} />
                  ))}
                </ul>
              )}
            </Step>

            <Step icon={NotebookPenIcon} title="Notes, quiz and playground" status={step("materials-workflow")}>
              {materials.size > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {MATERIALS.map((material) => (
                    <MaterialChip key={material.kind} {...material} status={materials.get(material.kind)} />
                  ))}
                </ul>
              )}
            </Step>

            <Step icon={SparklesIcon} title="Final touches" status={step("finalize-lesson")} isLast>
              {step("finalize-lesson") === "running" && (
                <ShimmerLabel className="text-muted-foreground text-sm">
                  Stitching the narration together and saving your lesson
                </ShimmerLabel>
              )}
            </Step>
          </ol>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function phaseLabel(progress: ReturnType<typeof readProgress>, ready: number, total: number) {
  const { step, scenes, workflow } = progress;
  if (!workflow || step("plan-lesson") !== "success") return "Planning the lesson";
  if (step("finalize-lesson") === "running") return "Putting it all together";
  if (step("video-workflow") === "running") {
    const statuses = [...scenes.values()];
    if (statuses.includes("narrating")) return `Recording narration · ${ready} of ${total} scenes ready`;
    return `Animating scenes · ${ready} of ${total} ready`;
  }
  return "Writing your notes and quiz";
}

// ── Stepper ──────────────────────────────────────────────────────────────

function Step({
  icon: Icon,
  title,
  status,
  isLast = false,
  children,
}: {
  icon: LucideIcon;
  title: string;
  status: StepStatus;
  isLast?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-4 pb-7 last:pb-0">
      {!isLast && (
        <span aria-hidden className="bg-border absolute top-10 bottom-1 left-4 w-0.5 -translate-x-1/2 overflow-hidden rounded-full">
          <motion.span
            className="bg-primary absolute inset-0 origin-top"
            initial={false}
            animate={{ scaleY: status === "success" ? 1 : 0 }}
            transition={{ duration: 0.7, ease: EASE_OUT }}
          />
        </span>
      )}
      <StepBadge icon={Icon} status={status} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 pt-1.5">
        <p className={cn("flex items-center gap-2 font-medium", status === "pending" && "text-muted-foreground")}>
          {title}
          <AnimatePresence>
            {status === "success" && (
              <motion.span {...appearSmall} className="text-muted-foreground text-xs font-normal">
                done
              </motion.span>
            )}
          </AnimatePresence>
        </p>
        {children}
      </div>
    </li>
  );
}

function StepBadge({ icon: Icon, status }: { icon: LucideIcon; status: StepStatus }) {
  return (
    <span className="relative flex size-8 shrink-0 items-center justify-center">
      {status === "running" && (
        <motion.span
          aria-hidden
          className="bg-primary/25 absolute inset-0 rounded-full"
          animate={{ scale: [1, 1.45], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={status}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={springy}
          className={cn(
            "relative flex size-8 items-center justify-center rounded-full border",
            status === "pending" && "text-muted-foreground bg-card",
            status === "running" && "border-primary bg-card text-primary",
            status === "success" && "bg-primary border-primary text-primary-foreground",
            status === "failed" && "border-destructive text-destructive bg-card",
          )}
        >
          {status === "success" ? <CheckIcon className="size-4" /> : <Icon className="size-4" />}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// ── Scenes ───────────────────────────────────────────────────────────────

const SCENE_PROGRESS = { narrating: 0.35, animating: 0.7, ready: 1 } as const;

function SceneCard({
  index,
  title,
  status,
}: {
  index: number;
  title: string;
  status: SceneProgress["status"] | undefined;
}) {
  const isReady = status === "ready";
  return (
    <motion.li
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: isReady ? [1, 1.03, 1] : 1 }}
      transition={{ duration: 0.4, delay: isReady ? 0 : index * 0.06, ease: EASE_OUT }}
      className={cn(
        "bg-card flex flex-col gap-2 overflow-hidden rounded-xl border p-3 transition-colors duration-500",
        isReady && "border-primary/30 bg-secondary/50",
      )}
    >
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
        <span className="tabular-nums">Scene {index + 1}</span>
        <SceneState status={status} />
      </div>
      <p className="text-sm leading-snug font-medium">{title}</p>
      <span className="bg-muted relative h-1 overflow-hidden rounded-full">
        <motion.span
          className="bg-primary absolute inset-y-0 left-0 rounded-full"
          initial={false}
          animate={{ width: `${(status ? SCENE_PROGRESS[status] : 0.06) * 100}%` }}
          transition={{ duration: 0.8, ease: EASE_OUT }}
        />
      </span>
    </motion.li>
  );
}

function SceneState({ status }: { status: SceneProgress["status"] | undefined }) {
  const content = {
    waiting: (
      <>
        <ClockIcon className="size-3" /> In line
      </>
    ),
    narrating: (
      <>
        <Waveform className="text-primary" /> Recording voice
      </>
    ),
    animating: (
      <>
        <Spinner className="text-primary size-3" /> <ShimmerLabel>Animating</ShimmerLabel>
      </>
    ),
    ready: (
      <>
        <CheckIcon className="text-primary size-3" /> Ready
      </>
    ),
  }[status ?? "waiting"];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={status ?? "waiting"} {...appearSmall} className="flex items-center gap-1.5">
        {content}
      </motion.span>
    </AnimatePresence>
  );
}

// ── Materials ────────────────────────────────────────────────────────────

const MATERIALS: { kind: MaterialProgress["kind"]; label: string; icon: LucideIcon }[] = [
  { kind: "notes", label: "Study notes", icon: NotebookPenIcon },
  { kind: "quiz", label: "Quiz", icon: CircleHelpIcon },
  { kind: "playground", label: "Playground", icon: ShapesIcon },
];

function MaterialChip({
  label,
  icon: Icon,
  status,
}: {
  label: string;
  icon: LucideIcon;
  status: MaterialProgress["status"] | undefined;
}) {
  const isReady = status === "ready";
  return (
    <motion.li
      {...appearSmall}
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors duration-500",
        isReady ? "bg-secondary text-secondary-foreground border-transparent" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" />
      {status === "writing" ? <ShimmerLabel>{label}</ShimmerLabel> : label}
      <AnimatePresence mode="wait" initial={false}>
        {isReady ? (
          <motion.span key="ready" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springy}>
            <CheckIcon className="size-3.5" />
          </motion.span>
        ) : status === "writing" ? (
          <motion.span key="writing" {...appearSmall}>
            <Spinner className="size-3" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
