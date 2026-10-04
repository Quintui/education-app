"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { EASE_OUT, springy } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Course, CourseLesson } from "@/mastra/schemas";

const WIDTH = 280;
const HEIGHT = 230;
const TRUNK_X = WIDTH / 2;
const GROUND_Y = 222;
const TRUNK_TOP = 34;

type Point = { x: number; y: number };

/** Point on a quadratic Bézier curve. */
function bezier(p0: Point, c: Point, p1: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y };
}

type NodeState = { isBuilt: boolean; isCurrent: boolean };

/**
 * The course drawn as the tree it is: fundamental (trunk) lessons on the trunk,
 * every module a branch carrying its lessons, and details sticking out as leaves.
 */
export function CourseTree({
  course,
  builtIds,
  currentId,
}: {
  course: Course;
  builtIds: Set<string>;
  currentId: string;
}) {
  const lessons = course.modules.flatMap((m) => m.lessons);
  const trunkLessons = lessons.filter((l) => l.depth === "trunk");
  const branches = course.modules
    .map((module) => ({ module, lessons: module.lessons.filter((l) => l.depth !== "trunk") }))
    .filter((branch) => branch.lessons.length > 0);

  const stateOf = (lesson: CourseLesson): NodeState => ({
    isBuilt: builtIds.has(lesson.id),
    isCurrent: lesson.id === currentId,
  });

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Your knowledge tree">
      <line x1={40} x2={WIDTH - 40} y1={GROUND_Y} y2={GROUND_Y} className="stroke-border" strokeWidth={2} strokeLinecap="round" />

      <motion.path
        d={`M ${TRUNK_X} ${GROUND_Y} L ${TRUNK_X} ${TRUNK_TOP}`}
        className="stroke-foreground/20"
        strokeWidth={9}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, ease: EASE_OUT }}
      />

      {branches.map(({ module, lessons: branchLessons }, k) => {
        const side = k % 2 === 0 ? -1 : 1;
        const anchorY = GROUND_Y - 50 - (k + 0.5) * ((GROUND_Y - 50 - TRUNK_TOP) / branches.length);
        const start = { x: TRUNK_X, y: anchorY };
        const end = { x: TRUNK_X + side * 112, y: anchorY - 34 };
        const control = { x: TRUNK_X + side * 46, y: anchorY - 2 };
        const delay = 0.5 + k * 0.15;

        return (
          <g key={module.id}>
            <motion.path
              d={`M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`}
              className="stroke-foreground/20"
              strokeWidth={4}
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay, ease: EASE_OUT }}
            />
            {branchLessons.map((lesson, i) => {
              const t = 0.35 + 0.65 * (branchLessons.length === 1 ? 0.5 : i / (branchLessons.length - 1));
              const point = bezier(start, control, end, t);
              // Leaves stick out above and below the branch, alternating.
              const offset = lesson.depth === "leaf" ? (i % 2 === 0 ? -12 : 12) : 0;
              return (
                <TreeNode
                  key={lesson.id}
                  lesson={lesson}
                  x={point.x}
                  y={point.y + offset}
                  side={side}
                  delay={delay + 0.3 + i * 0.08}
                  {...stateOf(lesson)}
                />
              );
            })}
          </g>
        );
      })}

      {trunkLessons.map((lesson, i) => {
        const y = GROUND_Y - 18 - i * ((GROUND_Y - 30 - TRUNK_TOP) / Math.max(trunkLessons.length, 1));
        return <TreeNode key={lesson.id} lesson={lesson} x={TRUNK_X} y={y} side={0} delay={0.3 + i * 0.1} {...stateOf(lesson)} />;
      })}
    </svg>
  );
}

function TreeNode({
  lesson,
  x,
  y,
  side,
  delay,
  isBuilt,
  isCurrent,
}: {
  lesson: CourseLesson;
  x: number;
  y: number;
  side: number;
  delay: number;
} & NodeState) {
  const isLeaf = lesson.depth === "leaf";
  const fill = isBuilt
    ? "fill-primary"
    : lesson.question
      ? "fill-highlight"
      : lesson.likelyKnown
        ? "fill-muted-foreground/30"
        : "fill-card";

  return (
    <Link href={`?lesson=${lesson.id}`} scroll={false} aria-label={lesson.title}>
      <title>{`${lesson.title} (${lesson.depth})`}</title>
      {isCurrent && (
        <motion.circle
          cx={x}
          cy={y}
          r={isLeaf ? 9 : 11}
          className="fill-primary/25"
          animate={{ scale: [1, 1.5], opacity: [0.8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}
      <motion.g
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ ...springy, delay }}
        style={{ transformOrigin: `${x}px ${y}px` }}
        className="cursor-pointer"
      >
        {isLeaf ? (
          <ellipse
            cx={x}
            cy={y}
            rx={8}
            ry={4.5}
            transform={`rotate(${side === 0 ? -30 : side * -35} ${x} ${y})`}
            className={cn(fill, "stroke-primary/60")}
            strokeWidth={1.5}
          />
        ) : (
          <circle
            cx={x}
            cy={y}
            r={lesson.depth === "trunk" ? 7.5 : 6}
            className={cn(fill, isBuilt ? "stroke-primary" : "stroke-primary/60")}
            strokeWidth={lesson.depth === "trunk" ? 2.5 : 1.5}
          />
        )}
      </motion.g>
    </Link>
  );
}
