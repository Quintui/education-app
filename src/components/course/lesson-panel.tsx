import Link from "next/link";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { LessonView } from "@/components/lesson/lesson-view";
import { Button } from "@/components/ui/button";
import { courseLessons } from "@/mastra/lib/course";
import type { Course, Lesson } from "@/mastra/schemas";
import { LessonBuilder } from "./lesson-builder";

type LessonPanelProps = { course: Course; nodeId: string; lesson: Lesson | null };

export function LessonPanel({ course, nodeId, lesson }: LessonPanelProps) {
  const lessons = courseLessons(course);
  const index = lessons.findIndex((l) => l.id === nodeId);
  const node = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        {node.module.title} · Lesson {index + 1} of {lessons.length}
      </p>

      {lesson ? (
        <LessonView lesson={lesson} />
      ) : (
        <LessonBuilder courseId={course.id} nodeId={node.id} title={node.title} goal={node.goal} />
      )}

      <nav className="flex items-center justify-between gap-2 pt-2" aria-label="Lesson navigation">
        {previous ? (
          <Button variant="ghost" nativeButton={false} render={<Link href={`?lesson=${previous.id}`} scroll={false} />}>
            <ArrowLeftIcon data-icon="inline-start" />
            {previous.title}
          </Button>
        ) : (
          <span />
        )}
        {next && (
          <Button
            variant={lesson ? "default" : "ghost"}
            nativeButton={false}
            render={<Link href={`?lesson=${next.id}`} scroll={false} />}
          >
            Next: {next.title}
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        )}
      </nav>
    </section>
  );
}
