import type { Course, CourseOutline, DiagnosticAnswers, Lesson } from "../schemas";

/** Stable, readable ids (m1, m1-l2, ...) and each lesson linked to the one it hangs on. */
export function withIds(outline: CourseOutline, meta: { id: string; topic: string }): Course {
  const seen: { id: string; title: string }[] = [];
  const parentOf = (hangsOn: string, depth: string) => {
    if (depth === "trunk") return undefined;
    const wanted = hangsOn.trim().toLowerCase();
    // Fall back to the previous lesson when the model's title does not match exactly.
    return (seen.find((l) => l.title.toLowerCase() === wanted) ?? seen.at(-1))?.id;
  };

  return {
    ...outline,
    ...meta,
    createdAt: new Date().toISOString(),
    modules: outline.modules.map((module, m) => ({
      ...module,
      id: `m${m + 1}`,
      lessons: module.lessons.map((lesson, l) => {
        const id = `m${m + 1}-l${l + 1}`;
        const node = { ...lesson, id, parentId: parentOf(lesson.hangsOn, lesson.depth) };
        seen.push({ id, title: lesson.title });
        return node;
      }),
    })),
  };
}

/** Grows a leaf lesson right after the lesson it hangs on. */
export function addLeaf(
  course: Course,
  parentId: string,
  leaf: { title: string; goal: string; question: string },
) {
  const group = course.modules.find((m) => m.lessons.some((l) => l.id === parentId));
  if (!group) throw new Error(`Lesson ${parentId} is not part of course ${course.id}`);

  const parent = group.lessons.find((l) => l.id === parentId)!;
  const siblings = group.lessons.filter((l) => l.id.startsWith(`${parentId}-q`)).length;
  const node = {
    ...leaf,
    id: `${parentId}-q${siblings + 1}`,
    depth: "leaf" as const,
    hangsOn: parent.title,
    parentId,
    likelyKnown: false,
  };

  // After the parent and any leaves already hanging on it.
  const index = group.lessons.findIndex((l) => l.id === parentId);
  let insertAt = index + 1;
  while (group.lessons[insertAt]?.parentId === parentId && group.lessons[insertAt].depth === "leaf") {
    insertAt++;
  }
  group.lessons.splice(insertAt, 0, node);
  return node;
}

export function findLesson(course: Course, nodeId: string) {
  return courseLessons(course).find((l) => l.id === nodeId);
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
  const parent = lesson.parentId ? lessons.find((l) => l.id === lesson.parentId) : undefined;

  const map = course.modules
    .map((module) => {
      const items = module.lessons.map((l) => {
        const marker = l.id === nodeId ? "→ THIS LESSON:" : built.has(l.id) ? "✓" : "-";
        return `   ${marker} ${l.title} (${l.depth})`;
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

THIS LESSON: ${lesson.title} (${lesson.depth})
Module: ${lesson.module.title} — ${lesson.module.summary}
Goal: ${lesson.goal}
${parent ? `Hangs on: "${parent.title}" — connect to it explicitly, it is what this lesson's details hang on.\n` : "This is a trunk lesson: a fundamental principle the rest of the course grows from.\n"}${lesson.question ? `The learner asked: "${lesson.question}" — answer it fully.\n` : ""}
${lesson.likelyKnown ? "The learner probably knows this already: make it a brisk refresher.\n" : ""}
ALREADY COVERED IN EARLIER LESSONS (build on it, do not re-explain):
${covered.length > 0 ? covered.join("\n") : "- Nothing yet. This is where the learner starts."}

COMES NEXT: ${next ? `${next.title} — ${next.goal}` : "This is the final lesson: land the whole course."}`;
}
