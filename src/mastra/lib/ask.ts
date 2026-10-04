import { formatTime } from "../../lib/format";
import type { Course, Lesson } from "../schemas";
import { findLesson } from "./course";

/** The scene on screen at `time` seconds into the lesson. */
export function sceneAt(lesson: Lesson, time: number) {
  return lesson.video.scenes.findLast((scene) => time >= scene.start) ?? lesson.video.scenes[0];
}

/** What the tutor needs to answer "wait, why?" about the exact moment the learner paused. */
export function buildAskContext(course: Course, lesson: Lesson, time: number) {
  const node = findLesson(course, lesson.nodeId);
  const parent = node?.parentId ? findLesson(course, node.parentId) : undefined;
  const current = sceneAt(lesson, time);
  const earlier = lesson.video.scenes.filter((scene) => scene.start < current.start);

  return `COURSE: ${course.title}
LEARNER: ${course.learnerProfile}

LESSON: ${lesson.title} — ${lesson.hook}
${parent ? `It hangs on the earlier lesson "${parent.title}".` : "It is a fundamental (trunk) lesson."}

THE LEARNER PAUSED AT ${formatTime(time)}, during the scene "${current.title}" (${current.goal}).
What the narrator just said: "${current.narration}"

EARLIER IN THIS LESSON:
${earlier.map((scene) => `- ${scene.title}: ${scene.narration}`).join("\n") || "- Nothing, this is the first scene."}

KEY TERMS: ${lesson.notes.keyTerms.map((t) => `${t.term} (${t.definition})`).join("; ")}`;
}
