import Link from "next/link";
import type { UIMessage } from "ai";
import { ArrowLeftIcon, ArrowRightIcon, MessageCircleQuestionIcon } from "lucide-react";
import { LessonView } from "@/components/lesson/lesson-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { courseLessons } from "@/mastra/lib/course";
import type { Course, Lesson } from "@/mastra/schemas";
import { HangsOnGate } from "./hangs-on-gate";
import { LessonBuilder } from "./lesson-builder";

type LessonPanelProps = {
  course: Course;
  nodeId: string;
  lesson: Lesson | null;
  builtIds: Set<string>;
  askHistory: UIMessage[];
};

export function LessonPanel({ course, nodeId, lesson, builtIds, askHistory }: LessonPanelProps) {
  const lessons = courseLessons(course);
  const index = lessons.findIndex((l) => l.id === nodeId);
  const node = lessons[index];
  const previous = lessons[index - 1];
  const next = lessons[index + 1];
  const parent = node.parentId ? lessons.find((l) => l.id === node.parentId) : undefined;
  const parentMissing = parent && !builtIds.has(parent.id) && !parent.likelyKnown;

  const builder = <LessonBuilder courseId={course.id} nodeId={node.id} title={node.title} goal={node.goal} />;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className="capitalize">
          {node.depth}
        </Badge>
        <span>
          {node.module.title} · Lesson {index + 1} of {lessons.length}
        </span>
        {parent && (
          <Link href={`?lesson=${parent.id}`} scroll={false} className="hover:text-foreground underline-offset-4 hover:underline">
            hangs on “{parent.title}”
          </Link>
        )}
        {node.question && (
          <span className="flex items-center gap-1">
            <MessageCircleQuestionIcon className="size-3.5" />
            from your question
          </span>
        )}
      </div>

      {lesson ? (
        <LessonView lesson={lesson} askHistory={askHistory} />
      ) : parentMissing ? (
        <HangsOnGate parent={parent}>{builder}</HangsOnGate>
      ) : (
        builder
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
