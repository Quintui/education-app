"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRightIcon, CircleCheckIcon, CompassIcon, LeafIcon } from "lucide-react";
import type { DataMessagePartProps } from "@assistant-ui/react";
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
import { Caret, StreamStatus } from "@/components/streaming";
import { appear, appearSmall, springy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CourseOutline, CoursePart, DeepPartial } from "@/mastra/schemas";

const MINUTES_PER_LESSON = 2;

function phaseLabel(outline: DeepPartial<CourseOutline>) {
  if (!outline.learnerProfile) return "Reading your answers";
  if (!outline.title) return "Figuring out where you're starting";
  const modules = outline.modules ?? [];
  if (modules.length === 0) return "Sketching the big picture";
  const current = modules.at(-1)?.title;
  return current ? `Adding lessons to “${current}”` : "Adding the next module";
}

export function CourseDraft({ data }: DataMessagePartProps<CoursePart>) {
  const isReady = data.status === "ready";
  const outline: DeepPartial<CourseOutline> = isReady ? data.course : data.outline;
  const modules = outline.modules ?? [];
  const lessonCount = modules.reduce((sum, m) => sum + (m?.lessons?.length ?? 0), 0);
  const palette = outline.styleGuide
    ? [outline.styleGuide.primary, outline.styleGuide.secondary, outline.styleGuide.accent]
    : [];

  return (
    <motion.div {...appear}>
      <Card>
        <CardHeader>
          <div className="flex min-h-6 flex-wrap items-center gap-2">
            <Badge variant="secondary">
              <CompassIcon data-icon="inline-start" />
              Your learning path
            </Badge>
            <AnimatePresence mode="wait" initial={false}>
              {isReady ? (
                <motion.span key="ready" {...appearSmall} className="text-primary flex items-center gap-1.5 text-sm font-medium">
                  <CircleCheckIcon className="size-4" />
                  Ready
                </motion.span>
              ) : (
                <motion.span key="drafting" {...appearSmall}>
                  <StreamStatus label={phaseLabel(outline)} />
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {outline.title ? (
            <CardTitle className="font-heading text-3xl tracking-tight text-balance">
              {outline.title}
              <Caret show={!isReady && !outline.tagline} />
            </CardTitle>
          ) : (
            <Skeleton className="h-8 w-2/3" />
          )}
          {outline.tagline && <CardDescription className="text-base">{outline.tagline}</CardDescription>}
        </CardHeader>

        <CardContent className="flex flex-col gap-6">
          {outline.learnerProfile ? (
            <motion.div {...appear} className="bg-secondary/60 rounded-xl p-4 text-sm leading-relaxed">
              <p className="text-secondary-foreground mb-1 font-medium">Where you’re starting</p>
              <p className="text-foreground/80">{outline.learnerProfile}</p>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4" aria-hidden>
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-4/5" />
            </div>
          )}

          {palette.length > 0 && (
            <motion.div {...appearSmall} className="text-muted-foreground flex items-center gap-2 text-xs">
              <span className="flex -space-x-1">
                {palette.map((color, i) => (
                  <motion.span
                    key={i}
                    className="ring-card size-4 rounded-full ring-2"
                    style={{ backgroundColor: color }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...springy, delay: i * 0.08 }}
                  />
                ))}
              </span>
              Every lesson shares this look: {outline.styleGuide?.motif}
            </motion.div>
          )}

          {modules.length > 0 && (
            <ol className="flex flex-col">
              {modules.map((module, m) => (
                <motion.li key={m} layout="position" {...appear} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* The path: a line connecting each module to the next. */}
                  {(m < modules.length - 1 || !isReady) && (
                    <motion.span
                      aria-hidden
                      className="bg-border absolute top-9 bottom-0 left-4 w-px origin-top"
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.6 }}
                    />
                  )}
                  <span className="bg-primary text-primary-foreground relative flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm">
                    {m + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                    <div>
                      <p className="font-heading leading-tight font-semibold">{module?.title}</p>
                      {module?.summary && <p className="text-muted-foreground text-sm">{module.summary}</p>}
                    </div>
                    <ul className="flex flex-col gap-1">
                      <AnimatePresence initial={false}>
                        {module?.lessons?.map((lesson, l) => (
                          <motion.li
                            key={l}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={springy}
                            className="flex items-center gap-2.5 text-sm"
                          >
                            {lesson?.depth === "leaf" ? (
                              <LeafIcon className="text-primary/60 size-3 shrink-0" />
                            ) : (
                              <span
                                className={cn(
                                  "border-primary/50 size-2 shrink-0 rounded-full border-2",
                                  lesson?.depth === "trunk" && "bg-primary border-primary",
                                )}
                              />
                            )}
                            <span
                              className={cn(
                                lesson?.likelyKnown && "text-muted-foreground",
                                lesson?.depth === "trunk" && "font-medium",
                              )}
                            >
                              {lesson?.title}
                            </span>
                            {lesson?.likelyKnown && (
                              <Badge variant="outline" className="text-muted-foreground">
                                you know this
                              </Badge>
                            )}
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>
                  </div>
                </motion.li>
              ))}
            </ol>
          )}

          {!isReady && outline.title && (
            <div className="flex items-center gap-4" aria-hidden>
              <Skeleton className="size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          )}
        </CardContent>

        <AnimatePresence>
          {isReady && (
            <motion.div {...appear}>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-muted-foreground text-sm">
                  {modules.length} modules · {lessonCount} lessons · about {lessonCount * MINUTES_PER_LESSON} minutes
                </span>
                <Button size="lg" nativeButton={false} render={<Link href={`/course/${data.course.id}`} />}>
                  Start learning
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              </CardFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
