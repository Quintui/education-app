import { CircleCheckIcon, CircleDashedIcon, CircleIcon, CirclePlayIcon, LeafIcon } from "lucide-react";
import type { CourseLesson } from "@/mastra/schemas";

export type LessonStatus = { isBuilt: boolean; isWatched: boolean; isCurrent: boolean };

export function LessonStatusIcon({ lesson, isBuilt, isWatched, isCurrent }: { lesson: CourseLesson } & LessonStatus) {
  if (isWatched) return <CircleCheckIcon className="text-primary size-4 shrink-0" />;
  if (isBuilt) return <CirclePlayIcon className="text-primary size-4 shrink-0" />;
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
