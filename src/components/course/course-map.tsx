"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleIcon,
  LeafIcon,
  MessageCircleQuestionIcon,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Course, CourseLesson } from "@/mastra/schemas";
import { CourseTree } from "./course-tree";

type CourseMapProps = {
  course: Course;
  builtIds: string[];
  currentId: string;
};

export function CourseMap({ course, builtIds, currentId }: CourseMapProps) {
  const built = new Set(builtIds);
  const lessons = course.modules.flatMap((m) => m.lessons);
  const titles = new Map(lessons.map((l) => [l.id, l.title]));

  return (
    <motion.aside
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      className="order-last lg:sticky lg:top-4 lg:order-none lg:self-start"
    >
      <Card>
        <CardHeader>
          <CardDescription>Your knowledge tree</CardDescription>
          <CardTitle className="font-heading text-xl leading-tight tracking-tight">{course.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CourseTree course={course} builtIds={built} currentId={currentId} />
          <p className="text-muted-foreground text-center text-xs text-pretty">
            Trunk first, then branches, then leaves, so every detail has something to hang on.
          </p>
          <div className="flex flex-col gap-1.5">
            <Progress value={(built.size / lessons.length) * 100} aria-label="Course progress" />
            <span className="text-muted-foreground text-xs tabular-nums">
              {built.size} of {lessons.length} lessons ready
            </span>
          </div>

          <Separator />

          <nav aria-label="Lessons" className="flex flex-col gap-5">
            {course.modules.map((module) => (
              <div key={module.id} className="flex flex-col gap-1">
                <p className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">{module.title}</p>
                <ul className="flex flex-col">
                  {module.lessons.map((lesson) => (
                    <LessonRow
                      key={lesson.id}
                      lesson={lesson}
                      parentTitle={lesson.parentId ? titles.get(lesson.parentId) : undefined}
                      isBuilt={built.has(lesson.id)}
                      isCurrent={lesson.id === currentId}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </CardContent>
      </Card>
    </motion.aside>
  );
}

function LessonRow({
  lesson,
  parentTitle,
  isBuilt,
  isCurrent,
}: {
  lesson: CourseLesson;
  parentTitle: string | undefined;
  isBuilt: boolean;
  isCurrent: boolean;
}) {
  const isLeaf = lesson.depth === "leaf";

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: EASE_OUT }}
      className={cn(isLeaf && "relative ms-4")}
    >
      {/* A leaf visibly hangs off the lesson above it. */}
      {isLeaf && (
        <span aria-hidden className="border-border absolute -top-1 bottom-1/2 -left-2 w-2 rounded-bl-md border-b border-l" />
      )}
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={`?lesson=${lesson.id}`}
              scroll={false}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "hover:bg-muted relative flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors",
                isCurrent && "text-secondary-foreground",
                lesson.depth === "trunk" && "font-medium",
              )}
            />
          }
        >
          {isCurrent && (
            <motion.span
              layoutId="current-lesson"
              className="bg-secondary absolute inset-0 -z-10 rounded-lg"
              transition={{ type: "spring", stiffness: 400, damping: 34 }}
            />
          )}
          <LessonIcon lesson={lesson} isBuilt={isBuilt} isCurrent={isCurrent} />
          <span className={cn("truncate", lesson.likelyKnown && !isCurrent && "text-muted-foreground")}>
            {lesson.title}
          </span>
          {lesson.question && <MessageCircleQuestionIcon className="text-muted-foreground ms-auto size-3.5 shrink-0" />}
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-64">
          <span className="capitalize">{lesson.depth}</span>
          {parentTitle ? ` · hangs on “${parentTitle}”` : " · a fundamental principle"}
          {lesson.question ? ` · from your question` : ""}
        </TooltipContent>
      </Tooltip>
    </motion.li>
  );
}

function LessonIcon({ lesson, isBuilt, isCurrent }: { lesson: CourseLesson; isBuilt: boolean; isCurrent: boolean }) {
  if (isBuilt) return <CircleCheckIcon className="text-primary size-4 shrink-0" />;
  if (isCurrent) {
    return (
      <span className="flex size-4 shrink-0 items-center justify-center">
        <span className="bg-primary size-2 animate-pulse rounded-full" />
      </span>
    );
  }
  if (lesson.depth === "leaf") return <LeafIcon className="text-muted-foreground size-4 shrink-0" />;
  if (lesson.likelyKnown) return <CircleDashedIcon className="text-muted-foreground size-4 shrink-0" />;
  return <CircleIcon className="text-muted-foreground/60 size-4 shrink-0" />;
}
