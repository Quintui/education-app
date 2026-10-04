"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  MessagePartPrimitive,
  SuggestionPrimitive,
  Suggestions,
  ThreadPrimitive,
  useAuiState,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import type { UIMessage } from "ai";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
  LeafIcon,
  MessageCircleQuestionIcon,
  PlayIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
} from "lucide-react";
import { StreamStatus } from "@/components/streaming";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { appear, appearSmall, EASE_OUT } from "@/lib/motion";
import type { LeafSuggestion, Lesson } from "@/mastra/schemas";

const CONFIG = AuiConfig({
  suggestions: Suggestions([
    "Can you explain that more simply?",
    "Why does that happen?",
    "Give me an everyday example",
  ]),
});

type AskTutorProps = {
  lesson: Lesson;
  /** Earlier questions in this lesson, restored from the tutor's memory. */
  history: UIMessage[];
  /** Where the lesson was paused, or null when the panel is closed. */
  time: number | null;
  onClose: () => void;
  onResume: () => void;
};

/**
 * Questions during a lesson. The runtime lives as long as the lesson, so the
 * conversation survives closing and reopening the panel.
 */
export function AskTutor({ lesson, history, time, onClose, onResume }: AskTutorProps) {
  // useChatRuntime always sends with the latest transport, so questions carry the current pause time.
  const runtime = useChatRuntime({
    messages: history,
    transport: new AssistantChatTransport({
      api: "/api/ask",
      body: { courseId: lesson.courseId, nodeId: lesson.nodeId, time: time ?? 0 },
    }),
  });

  const scene = time === null ? undefined : lesson.video.scenes.findLast((s) => time >= s.start);

  return (
    <AssistantRuntimeProvider runtime={runtime} config={CONFIG}>
      <AnimatePresence initial={false}>
        {time !== null && (
          <motion.section
            key="ask"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
            className="overflow-hidden"
            aria-label="Ask about this moment"
          >
            <Card className="ring-primary/25">
              <CardHeader className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MessageCircleQuestionIcon className="text-primary size-4" />
                    Ask about this moment
                  </CardTitle>
                  <CardDescription>
                    Paused at {formatTime(time)}
                    {scene ? ` · ${scene.title}` : ""}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" size="sm" onClick={onResume}>
                    <PlayIcon data-icon="inline-start" />
                    Continue watching
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close questions">
                    <XIcon />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <AskThread lesson={lesson} />
              </CardContent>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>
    </AssistantRuntimeProvider>
  );
}

function AskThread({ lesson }: { lesson: Lesson }) {
  return (
    <ThreadPrimitive.Root className="flex flex-col gap-3">
      <ThreadPrimitive.Viewport className="flex max-h-96 flex-col gap-4 overflow-y-auto">
        <AuiIf condition={(s) => s.thread.isEmpty}>
          <div className="flex flex-wrap gap-2">
            <ThreadPrimitive.Suggestions>
              {() => (
                <SuggestionPrimitive.Trigger
                  send
                  render={
                    <button
                      type="button"
                      className="bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 focus-visible:ring-ring/50 rounded-full border px-3 py-1 text-sm transition-colors outline-none focus-visible:ring-2"
                    />
                  }
                >
                  <SuggestionPrimitive.Title />
                </SuggestionPrimitive.Trigger>
              )}
            </ThreadPrimitive.Suggestions>
          </div>
        </AuiIf>
        <ThreadPrimitive.Messages>
          {({ message }) => (message.role === "user" ? <Question /> : <Answer lesson={lesson} />)}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Viewport>

      <ComposerPrimitive.Root className="bg-background border-foreground/10 focus-within:border-primary/40 flex items-end gap-2 rounded-xl border p-1.5 transition-colors">
        <ComposerPrimitive.Input
          autoFocus
          rows={1}
          placeholder="Ask anything about what you just saw…"
          aria-label="Your question"
          className="placeholder:text-muted-foreground/60 max-h-32 min-h-8 flex-1 resize-none bg-transparent px-2 py-1 text-sm leading-6 outline-none"
        />
        <ComposerPrimitive.Send render={<Button size="icon-sm" className="rounded-full" aria-label="Ask" />}>
          <ArrowUpIcon />
        </ComposerPrimitive.Send>
      </ComposerPrimitive.Root>
    </ThreadPrimitive.Root>
  );
}

function Question() {
  return (
    <MessagePrimitive.Root render={<motion.div {...appearSmall} />} className="flex justify-end">
      <div className="bg-secondary text-secondary-foreground max-w-[85%] rounded-2xl rounded-br-md px-3.5 py-2 text-sm">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function Answer({ lesson }: { lesson: Lesson }) {
  return (
    <MessagePrimitive.Root render={<motion.div {...appearSmall} />} className="flex gap-2.5">
      <span className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full">
        <SparklesIcon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm leading-relaxed">
        <MessagePrimitive.Parts>
          {({ part }) => {
            if (part.type === "text") return <MessagePartPrimitive.Text className="whitespace-pre-wrap" />;
            if (part.type === "tool-call" && part.toolName === "suggestLeafLesson" && part.result) {
              return <LeafSuggestionCard lesson={lesson} suggestion={part.result as LeafSuggestion} />;
            }
            return null;
          }}
        </MessagePrimitive.Parts>
        <Thinking />
        <MessagePrimitive.Error>
          <ErrorPrimitive.Root className="text-destructive text-sm">
            <ErrorPrimitive.Message />
          </ErrorPrimitive.Root>
        </MessagePrimitive.Error>
      </div>
    </MessagePrimitive.Root>
  );
}

function Thinking() {
  const isWaiting = useAuiState(
    (s) => s.message.status?.type === "running" && s.message.parts.length === 0,
  );
  return isWaiting ? <StreamStatus label="Thinking about your question" /> : null;
}

// ── Growing the tree from a question ─────────────────────────────────────

type GrowState = { status: "idle" } | { status: "adding" } | { status: "added"; nodeId: string } | { status: "failed" };

function LeafSuggestionCard({ lesson, suggestion }: { lesson: Lesson; suggestion: LeafSuggestion }) {
  const router = useRouter();
  const [state, setState] = useState<GrowState>({ status: "idle" });
  const question = useAuiState((s) => {
    const last = s.thread.messages.findLast((m) => m.role === "user")?.content[0];
    return last?.type === "text" ? last.text : "";
  });

  async function grow() {
    setState({ status: "adding" });
    const res = await fetch(`/api/course/${lesson.courseId}/leaves`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: lesson.nodeId, ...suggestion, question }),
    });
    if (!res.ok) return setState({ status: "failed" });
    const { nodeId } = (await res.json()) as { nodeId: string };
    setState({ status: "added", nodeId });
    // The course tree on the left grows the new leaf.
    router.refresh();
  }

  return (
    <motion.div
      {...appear}
      className="border-primary/40 bg-secondary/40 flex flex-col gap-2 rounded-xl border border-dashed p-3"
    >
      <span className="text-secondary-foreground flex items-center gap-1.5 text-xs font-medium">
        <LeafIcon className="size-3.5" />
        Worth its own lesson
      </span>
      <div>
        <p className="font-medium">{suggestion.title}</p>
        <p className="text-muted-foreground">{suggestion.goal}</p>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {state.status === "added" ? (
          <motion.div key="added" {...appearSmall} className="flex flex-wrap items-center gap-2">
            <span className="text-primary flex items-center gap-1.5 font-medium">
              <CheckIcon className="size-4" />
              Added to your tree
            </span>
            <Button
              variant="ghost"
              size="sm"
              nativeButton={false}
              render={<Link href={`?lesson=${state.nodeId}`} scroll={false} />}
            >
              Open it
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </motion.div>
        ) : (
          <motion.div key="grow" {...appearSmall} className="flex items-center gap-2">
            <Button size="sm" onClick={grow} disabled={state.status === "adding"}>
              {state.status === "adding" ? <Spinner data-icon="inline-start" /> : <PlusIcon data-icon="inline-start" />}
              Grow it on my tree
            </Button>
            {state.status === "failed" && <span className="text-destructive">Could not add it. Try again.</span>}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
