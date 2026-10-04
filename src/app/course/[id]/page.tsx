import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { CourseMap } from "@/components/course/course-map";
import { LessonPanel } from "@/components/course/lesson-panel";
import { courseLessons, startLessonId } from "@/mastra/lib/course";
import { getAskHistory } from "@/lib/ask-history";
import { getCourse, getCourseLessons, getCourseProgress } from "@/mastra/lib/store";

export async function generateMetadata({ params }: PageProps<"/course/[id]">): Promise<Metadata> {
  const course = await getCourse((await params).id);
  return { title: course ? `${course.title} · Lumen` : "Course not found · Lumen" };
}

export default async function CoursePage({ params, searchParams }: PageProps<"/course/[id]">) {
  const course = await getCourse((await params).id);
  if (!course) notFound();

  const requested = (await searchParams).lesson;
  const nodeId =
    typeof requested === "string" && courseLessons(course).some((l) => l.id === requested)
      ? requested
      : startLessonId(course);
  const built = await getCourseLessons(course);
  const lesson = built.get(nodeId) ?? null;
  const [progress, askHistory] = await Promise.all([
    getCourseProgress(course, built),
    lesson ? getAskHistory(lesson.id) : [],
  ]);
  const watchedIds = [...progress].flatMap(([id, p]) => (p.watchedAt ? [id] : []));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader />
      <main className="mx-auto grid w-full max-w-7xl gap-6 px-4 pt-2 pb-16 sm:px-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <CourseMap course={course} builtIds={[...built.keys()]} watchedIds={watchedIds} currentId={nodeId} />
        {/* Keyed by lesson so switching lessons starts fresh (and starts building if needed). */}
        <LessonPanel
          key={nodeId}
          course={course}
          nodeId={nodeId}
          lesson={lesson}
          builtIds={new Set(built.keys())}
          askHistory={askHistory}
        />
      </main>
    </div>
  );
}
