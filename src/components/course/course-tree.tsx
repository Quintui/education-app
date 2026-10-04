"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MessageCircleQuestionIcon, NetworkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Course, CourseLesson } from "@/mastra/schemas";
import { LessonStatusIcon } from "./lesson-status-icon";

const CARD_W = 196;
const CARD_H = 48;
const GAP_X = 48;
const ROW_H = 58;

type Placed = { lesson: CourseLesson; level: number; x: number; y: number };

/**
 * A tidy tree from the "hangs on" links: foundations on the left, what builds on
 * them to the right. Leaves get their own row; a parent sits centred on its children.
 */
function layoutTree(lessons: CourseLesson[]) {
  const ids = new Set(lessons.map((l) => l.id));
  const children = new Map<string, CourseLesson[]>();
  const roots: CourseLesson[] = [];
  for (const lesson of lessons) {
    if (lesson.parentId && ids.has(lesson.parentId)) {
      children.set(lesson.parentId, [...(children.get(lesson.parentId) ?? []), lesson]);
    } else {
      roots.push(lesson);
    }
  }

  const placed: Placed[] = [];
  let nextRow = 0;
  const visit = (lesson: CourseLesson, level: number): number => {
    const kids = children.get(lesson.id) ?? [];
    const rows = kids.map((kid) => visit(kid, level + 1));
    const row = rows.length > 0 ? (rows[0] + rows[rows.length - 1]) / 2 : nextRow++;
    placed.push({ lesson, level, x: level * (CARD_W + GAP_X), y: row * ROW_H });
    return row;
  };
  roots.forEach((root) => visit(root, 0));

  const levels = Math.max(...placed.map((p) => p.level)) + 1;
  return {
    nodes: placed,
    width: levels * (CARD_W + GAP_X) - GAP_X,
    height: nextRow * ROW_H - (ROW_H - CARD_H),
  };
}

type CourseTreeProps = {
  course: Course;
  builtIds: Set<string>;
  watchedIds: Set<string>;
  currentId: string;
};

export function CourseTreeDialog(props: CourseTreeProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <NetworkIcon data-icon="inline-start" />
        View tree
      </DialogTrigger>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-4 sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Your knowledge tree</DialogTitle>
          <DialogDescription className="text-pretty">
            Each lesson builds on the one to its left. Start from the trunk (bold) and work toward the leaves,
            so every detail has something to hang on.
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-4 min-h-0 flex-1 overflow-auto px-4 pb-2">
          <CourseTree {...props} onNavigate={() => setOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CourseTree({
  course,
  builtIds,
  watchedIds,
  currentId,
  onNavigate,
}: CourseTreeProps & { onNavigate: () => void }) {
  const { nodes, width, height } = layoutTree(course.modules.flatMap((m) => m.lessons));
  const byId = new Map(nodes.map((n) => [n.lesson.id, n]));

  return (
    <div className="relative" style={{ width, height }}>
      <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
        {nodes.map(({ lesson, level, x, y }) => {
          const parent = lesson.parentId ? byId.get(lesson.parentId) : undefined;
          if (!parent) return null;
          const x1 = parent.x + CARD_W;
          const y1 = parent.y + CARD_H / 2;
          const y2 = y + CARD_H / 2;
          const mid = (x1 + x) / 2;
          return (
            <motion.path
              key={lesson.id}
              d={`M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x} ${y2}`}
              fill="none"
              strokeWidth={1.5}
              className={watchedIds.has(lesson.id) ? "stroke-primary/60" : "stroke-border"}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.1 + level * 0.15, ease: EASE_OUT }}
            />
          );
        })}
      </svg>

      {nodes.map(({ lesson, level, x, y }) => {
        const isCurrent = lesson.id === currentId;
        const isWatched = watchedIds.has(lesson.id);
        return (
          <motion.div
            key={lesson.id}
            className="absolute"
            style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: level * 0.15 + y / 4000, ease: EASE_OUT }}
          >
            <Link
              href={`?lesson=${lesson.id}`}
              scroll={false}
              onClick={onNavigate}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "hover:border-primary/40 flex size-full items-center gap-2 rounded-lg border px-3 text-[13px] transition-colors",
                isWatched ? "bg-secondary text-secondary-foreground border-transparent" : "bg-card",
                isCurrent && "ring-primary ring-2",
                lesson.depth === "trunk" && "font-medium",
                lesson.likelyKnown && !isWatched && "text-muted-foreground",
              )}
            >
              <LessonStatusIcon
                lesson={lesson}
                isBuilt={builtIds.has(lesson.id)}
                isWatched={isWatched}
                isCurrent={isCurrent}
              />
              <span className="line-clamp-2 leading-tight">{lesson.title}</span>
              {lesson.question && (
                <MessageCircleQuestionIcon className="text-muted-foreground ms-auto size-3.5 shrink-0" />
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
