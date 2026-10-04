import type { Course, CourseOutline, DiagnosticAnswers, Lesson } from "../schemas";

/** Stable, readable ids: m1, m1-l2, ... */
export function withIds(outline: CourseOutline, meta: { id: string; topic: string }): Course {
  return {
    ...outline,
    ...meta,
    createdAt: new Date().toISOString(),
    modules: outline.modules.map((module, m) => ({
      ...module,
      id: `m${m + 1}`,
      lessons: module.lessons.map((lesson, l) => ({ ...lesson, id: `m${m + 1}-l${l + 1}` })),
    })),
  };
}

export function courseLessons(course: Course) {
  return course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, module })),
  );
}

/** First lesson the learner probably does not know yet. */
export function startLessonId(course: Course) {
  const lessons = courseLessons(course);
  return (lessons.find((lesson) => !lesson.likelyKnown) ?? lessons[0]).id;
}

export function describeAnswers(answers: DiagnosticAnswers) {
  const level = {
    new: "Completely new to this topic",
    basics: "Knows the basics",
    comfortable: "Already fairly comfortable with it",
  }[answers.level];

  const lines = answers.answers.map((a) => {
    const verdict = a.correct === null ? "not sure" : a.correct ? "correct" : "incorrect";
    return `- ${a.question} → "${a.answer}" (${verdict})`;
  });
  return `Topic: ${answers.topic}\nSelf-assessment: ${level}\nKnowledge check:\n${lines.join("\n")}`;
}

/**
 * Everything a single lesson needs to fit into the course: who the learner is,
 * where this lesson sits, what earlier lessons already taught and what comes next.
 */
export function buildLessonBrief(course: Course, nodeId: string, built: Map<string, Lesson>) {
  const lessons = courseLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === nodeId);
  if (index === -1) throw new Error(`Lesson ${nodeId} is not part of course ${course.id}`);

  const lesson = lessons[index];
  const next = lessons[index + 1];

  const map = course.modules
    .map((module) => {
      const items = module.lessons.map((l) => {
        const marker = l.id === nodeId ? "→ THIS LESSON:" : built.has(l.id) ? "✓" : "-";
        return `   ${marker} ${l.title}`;
      });
      return `${module.title}\n${items.join("\n")}`;
    })
    .join("\n");

  const covered = lessons
    .slice(0, index)
    .flatMap((l) => {
      const done = built.get(l.id);
      if (!done) return [];
      const terms = done.notes.keyTerms.map((t) => t.term).join(", ");
      return [`- ${l.title}: ${done.notes.summary} (terms: ${terms})`];
    });

  return `COURSE: ${course.title} — ${course.tagline}

LEARNER: ${course.learnerProfile}

COURSE MAP:
${map}

THIS LESSON: ${lesson.title}
Module: ${lesson.module.title} — ${lesson.module.summary}
Goal: ${lesson.goal}
${lesson.likelyKnown ? "The learner probably knows this already: make it a brisk refresher.\n" : ""}
ALREADY COVERED IN EARLIER LESSONS (build on it, do not re-explain):
${covered.length > 0 ? covered.join("\n") : "- Nothing yet. This is where the learner starts."}

COMES NEXT: ${next ? `${next.title} — ${next.goal}` : "This is the final lesson: land the whole course."}`;
}
