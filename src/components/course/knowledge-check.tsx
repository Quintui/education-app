"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRightIcon,
  BookOpenIcon,
  CircleCheckIcon,
  GraduationCapIcon,
  SproutIcon,
} from "lucide-react";
import { useAui, useAuiState, type DataMessagePartProps } from "@assistant-ui/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Caret, StreamStatus } from "@/components/streaming";
import { appear, appearSmall, springy } from "@/lib/motion";
import type {
  DeepPartial,
  Diagnostic,
  DiagnosticAnswers,
  DiagnosticPart,
  LearnerLevel,
} from "@/mastra/schemas";

const LEVELS: { value: LearnerLevel; label: string; icon: typeof SproutIcon }[] = [
  { value: "new", label: "New to this", icon: SproutIcon },
  { value: "basics", label: "I know the basics", icon: BookOpenIcon },
  { value: "comfortable", label: "Pretty comfortable", icon: GraduationCapIcon },
];

const UNSURE = "unsure";

export function KnowledgeCheck({ data }: DataMessagePartProps<DiagnosticPart>) {
  const aui = useAui();
  // Once the learner has answered, a newer message follows this one and the card locks.
  const isSubmitted = useAuiState((s) => s.message.index < s.thread.messages.length - 1);
  const [level, setLevel] = useState<LearnerLevel | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const { topic, status, diagnostic } = data;
  const questions: DeepPartial<Diagnostic["questions"][number]>[] = diagnostic.questions ?? [];
  const isWriting = status === "writing";
  const answeredCount = Object.keys(answers).length;
  const canSubmit = !isWriting && level !== null;

  function submit() {
    if (!level || status !== "ready") return;
    const payload: DiagnosticAnswers = {
      topic,
      level,
      answers: questions.map((q, i) => {
        const picked = answers[i];
        if (picked === undefined || picked === UNSURE) {
          return { question: q.question ?? "", answer: "Not sure", correct: null };
        }
        const index = Number(picked);
        return { question: q.question ?? "", answer: q.options?.[index] ?? "", correct: index === q.correctIndex };
      }),
    };
    const levelLabel = LEVELS.find((l) => l.value === level)!.label;
    aui.thread.append({
      role: "user",
      content: [
        { type: "text", text: `${levelLabel}. I answered ${answeredCount} of ${questions.length}, build my course!` },
        { type: "data", name: "answers", data: payload },
      ],
    });
  }

  if (isSubmitted) {
    const levelLabel = LEVELS.find((l) => l.value === level)?.label;
    return (
      <motion.div {...appear}>
        <Card size="sm">
          <CardContent className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={springy}>
              <CircleCheckIcon className="text-primary size-5" />
            </motion.span>
            <span className="font-medium">Quick check done</span>
            <span className="text-muted-foreground text-sm">
              {levelLabel ? `${levelLabel} · ` : ""}
              {answeredCount} of {questions.length} answered
            </span>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...appear}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Quick check</Badge>
            <span className="text-muted-foreground text-xs">about a minute · not a test</span>
          </div>
          <CardTitle className="font-heading text-2xl tracking-tight text-balance">
            Where are you starting from?
          </CardTitle>
          <CardDescription className="min-h-5">
            {diagnostic.intro ? (
              <>
                {diagnostic.intro}
                <Caret show={isWriting && questions.length === 0} />
              </>
            ) : (
              <StreamStatus label="Thinking about what to ask you" />
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-7">
          <section className="flex flex-col gap-2.5">
            <h3 className="text-sm font-medium">How familiar are you with it?</h3>
            <ToggleGroup
              variant="outline"
              className="flex-wrap"
              value={level ? [level] : []}
              onValueChange={(value) => setLevel((value[0] as LearnerLevel | undefined) ?? null)}
            >
              {LEVELS.map(({ value, label, icon: Icon }) => (
                <ToggleGroupItem key={value} value={value} aria-label={label}>
                  <Icon data-icon="inline-start" />
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <ol className="flex flex-col gap-6">
            <AnimatePresence initial={false}>
              {questions.map((question, index) => (
                <motion.li key={index} layout="position" {...appear} className="flex flex-col gap-2.5">
                  <p className="flex gap-2.5 text-sm font-medium">
                    <span className="bg-secondary text-secondary-foreground flex size-5 shrink-0 items-center justify-center rounded-full text-xs tabular-nums">
                      {index + 1}
                    </span>
                    <span>
                      {question.question}
                      <Caret show={isWriting && index === questions.length - 1 && !question.options?.length} />
                    </span>
                  </p>
                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    className="ms-7.5 flex-wrap"
                    value={answers[index] !== undefined ? [answers[index]] : []}
                    onValueChange={(value) =>
                      setAnswers((prev) => {
                        const next = { ...prev };
                        if (value[0] === undefined) delete next[index];
                        else next[index] = value[0] as string;
                        return next;
                      })
                    }
                  >
                    {question.options?.map((option, optionIndex) => (
                      <motion.div key={optionIndex} {...appearSmall}>
                        <ToggleGroupItem value={String(optionIndex)}>{option}</ToggleGroupItem>
                      </motion.div>
                    ))}
                    {(question.options?.length ?? 0) >= 3 && (
                      <motion.div {...appearSmall}>
                        <ToggleGroupItem value={UNSURE} className="text-muted-foreground border-dashed">
                          Not sure
                        </ToggleGroupItem>
                      </motion.div>
                    )}
                  </ToggleGroup>
                </motion.li>
              ))}
            </AnimatePresence>

            {isWriting && diagnostic.intro && (
              <motion.li layout="position" {...appear} className="flex flex-col gap-2.5" aria-hidden>
                <div className="flex items-center gap-2.5">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <div className="ms-7.5 flex gap-2">
                  <Skeleton className="h-7 w-28" />
                  <Skeleton className="h-7 w-36" />
                  <Skeleton className="h-7 w-24" />
                </div>
              </motion.li>
            )}
          </ol>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <AnimatePresence mode="wait" initial={false}>
            {isWriting ? (
              <motion.span key="writing" {...appearSmall}>
                <StreamStatus label={`Writing question ${questions.length + 1}`} />
              </motion.span>
            ) : (
              <motion.span key="count" {...appearSmall} className="text-muted-foreground text-sm">
                {level ? `${answeredCount} of ${questions.length} answered. Skipped ones count as “not sure”.` : "Pick how familiar you are to continue."}
              </motion.span>
            )}
          </AnimatePresence>
          <Button onClick={submit} disabled={!canSubmit}>
            Build my course
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
