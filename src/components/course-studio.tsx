"use client";

import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiConfig,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  Suggestions,
  ThreadPrimitive,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpIcon,
  ClapperboardIcon,
  NotebookPenIcon,
  RotateCcwIcon,
  RouteIcon,
} from "lucide-react";
import { CourseDataRenderers } from "@/components/course/course-data-ui";
import { StreamStatus } from "@/components/streaming";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { appear, EASE_OUT } from "@/lib/motion";

const CONFIG = AuiConfig({
  suggestions: Suggestions([
    "How do black holes form?",
    "How does attention work in transformers?",
    "Why does compound interest snowball?",
    "How do mRNA vaccines teach the body?",
  ]),
});

/**
 * Not a chat: one topic in, then a guided flow (knowledge check → course).
 * assistant-ui still runs the conversation and streaming underneath.
 */
export function CourseStudio() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/course" }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={CONFIG}>
      <CourseDataRenderers />
      <Flow />
    </AssistantRuntimeProvider>
  );
}

function Flow() {
  const isEmpty = useAuiState((s) => s.thread.isEmpty);

  return (
    <ThreadPrimitive.Root className="h-full">
      <ThreadPrimitive.Viewport className="h-full overflow-y-auto scroll-smooth">
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pb-16">
          <AnimatePresence mode="wait" initial={false}>
            {isEmpty ? (
              <motion.div
                key="start"
                exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{ duration: 0.35, ease: EASE_OUT }}
                className="flex flex-1 flex-col justify-center gap-8 py-10"
              >
                <Welcome />
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
                  <TopicComposer />
                  <TopicSuggestions />
                </div>
              </motion.div>
            ) : (
              <motion.div key="flow" {...appear} className="flex flex-col gap-6 pt-4">
                <TopicHeader />
                <ThreadPrimitive.Messages>
                  {({ message }) => (message.role === "assistant" ? <FlowStep /> : null)}
                </ThreadPrimitive.Messages>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

// ── Start ────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: RouteIcon, label: "A path made for you" },
  { icon: ClapperboardIcon, label: "Animated lessons" },
  { icon: NotebookPenIcon, label: "Notes, quizzes, playgrounds" },
];

function Welcome() {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.h1
        initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 0.6, ease: EASE_OUT }}
        className="text-4xl font-bold tracking-tight text-balance sm:text-6xl"
      >
        What do you want to{" "}
        <span className="relative inline-block">
          <motion.span
            aria-hidden
            className="bg-highlight/70 absolute inset-x-0 bottom-[0.08em] -z-10 h-[0.38em] origin-left rounded-sm"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.45, ease: EASE_OUT }}
          />
          understand
        </span>{" "}
        today?
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: EASE_OUT }}
        className="text-muted-foreground max-w-xl text-lg text-pretty"
      >
        Name any topic. We check what you already know, map out a course that goes deeper step by step,
        and turn every lesson into an animated explainer.
      </motion.p>
      <div className="flex flex-wrap justify-center gap-2">
        {FEATURES.map(({ icon: Icon, label }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 + i * 0.08, ease: EASE_OUT }}
          >
            <Badge variant="outline">
              <Icon data-icon="inline-start" />
              {label}
            </Badge>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function TopicComposer() {
  return (
    <ComposerPrimitive.Root className="bg-card border-foreground/10 focus-within:border-primary/40 focus-within:ring-primary/10 flex w-full flex-col gap-2 rounded-[1.25rem] border p-2.5 shadow-sm transition-[border-color,box-shadow] focus-within:ring-4">
      <ComposerPrimitive.Input
        autoFocus
        rows={1}
        placeholder="Explain how ... works"
        aria-label="What do you want to learn?"
        className="placeholder:text-muted-foreground/60 caret-primary max-h-40 min-h-12 w-full resize-none bg-transparent px-2.5 py-1.5 text-lg leading-7 outline-none"
      />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground ps-2.5 text-xs">
          <Kbd>Enter</Kbd> to start
        </span>
        <ComposerPrimitive.Send render={<Button size="icon-lg" className="rounded-full" aria-label="Start" />}>
          <ArrowUpIcon />
        </ComposerPrimitive.Send>
      </div>
    </ComposerPrimitive.Root>
  );
}

function TopicSuggestions() {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <ThreadPrimitive.Suggestions>
        {() => (
          <SuggestionPrimitive.Trigger
            send
            render={
              <button
                type="button"
                className="bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 focus-visible:ring-ring/50 rounded-full border px-3.5 py-1.5 text-sm shadow-xs transition-colors outline-none focus-visible:ring-2"
              />
            }
          >
            <SuggestionPrimitive.Title />
          </SuggestionPrimitive.Trigger>
        )}
      </ThreadPrimitive.Suggestions>
    </div>
  );
}

// ── Flow ─────────────────────────────────────────────────────────────────

function TopicHeader() {
  const aui = useAui();
  const topic = useAuiState((s) => {
    const first = s.thread.messages[0]?.content.find((part) => part.type === "text");
    return first?.type === "text" ? first.text : "";
  });

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-muted-foreground text-sm">You want to understand</p>
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">{topic}</h1>
      </div>
      <Button variant="ghost" size="sm" onClick={() => aui.threads.switchToNewThread()}>
        <RotateCcwIcon data-icon="inline-start" />
        Start over
      </Button>
    </header>
  );
}

/** Each assistant turn is a step of the flow: its data parts are the cards. */
function FlowStep() {
  return (
    <MessagePrimitive.Root className="flex flex-col gap-6">
      <MessagePrimitive.Parts>
        {({ part }) => (part.type === "data" ? (part.dataRendererUI ?? null) : null)}
      </MessagePrimitive.Parts>
      <RunningIndicator />
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root render={<Alert variant="destructive" />}>
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <ErrorPrimitive.Message />
            <ActionBarPrimitive.Root>
              <ActionBarPrimitive.Reload render={<Button variant="outline" size="sm" />}>
                <RotateCcwIcon data-icon="inline-start" />
                Try again
              </ActionBarPrimitive.Reload>
            </ActionBarPrimitive.Root>
          </AlertDescription>
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

/** Until the first card streams in, say that something is happening. */
function RunningIndicator() {
  const isWaiting = useAuiState(
    (s) => s.message.status?.type === "running" && !s.message.parts.some((part) => part.type === "data"),
  );
  if (!isWaiting) return null;
  return <StreamStatus label="Getting started" className="py-2" />;
}
