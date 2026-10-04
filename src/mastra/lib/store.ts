import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb, schema } from "../db";
import type { LessonProgress } from "../db/schema";
import type { Course, Lesson } from "../schemas";
import { MEDIA_DIR } from "./paths";

// Courses, lessons and progress live in SQLite; audio, scene code and playgrounds
// are plain files next to it.

const ID_PATTERN = /^[a-z0-9-]+$/;
const FILE_PATTERN = /^(?:[a-z0-9-]+\/)?[a-z0-9-]+\.(?:mp3|js|html)$/;

export function slugId(title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || "course"}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Lessons are addressed by their place in a course, so "is it built?" is a single lookup. */
export function lessonIdFor(courseId: string, nodeId: string) {
  return `${courseId}-${nodeId}`;
}

// ── Media files ──────────────────────────────────────────────────────────

function mediaPath(lessonId: string, file: string) {
  if (!ID_PATTERN.test(lessonId) || !FILE_PATTERN.test(file)) {
    throw new Error(`Invalid lesson path: ${lessonId}/${file}`);
  }
  return path.join(MEDIA_DIR, lessonId, file);
}

export async function writeLessonFile(lessonId: string, file: string, data: string | Uint8Array) {
  const target = mediaPath(lessonId, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, data);
}

export async function readLessonFile(lessonId: string, file: string) {
  try {
    return await readFile(mediaPath(lessonId, file));
  } catch {
    return null;
  }
}

// ── Courses ──────────────────────────────────────────────────────────────

export async function saveCourse(course: Course) {
  const db = await getDb();
  const row = { id: course.id, topic: course.topic, title: course.title, data: course };
  await db
    .insert(schema.courses)
    .values({ ...row, createdAt: new Date(course.createdAt) })
    .onConflictDoUpdate({ target: schema.courses.id, set: row });
}

export async function getCourse(courseId: string): Promise<Course | null> {
  const db = await getDb();
  const row = await db.query.courses.findFirst({ where: eq(schema.courses.id, courseId) });
  return row?.data ?? null;
}

// ── Lessons ──────────────────────────────────────────────────────────────

export async function saveLesson(lesson: Lesson) {
  const db = await getDb();
  await db
    .insert(schema.lessons)
    .values({
      id: lesson.id,
      courseId: lesson.courseId,
      nodeId: lesson.nodeId,
      data: lesson,
      createdAt: new Date(lesson.createdAt),
    })
    .onConflictDoUpdate({ target: schema.lessons.id, set: { data: lesson } });
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const db = await getDb();
  const row = await db.query.lessons.findFirst({ where: eq(schema.lessons.id, lessonId) });
  return row?.data ?? null;
}

/** Built lessons of a course, keyed by node id. */
export async function getCourseLessons(course: Course) {
  const db = await getDb();
  const rows = await db.query.lessons.findMany({ where: eq(schema.lessons.courseId, course.id) });
  return new Map(rows.map((row) => [row.nodeId, row.data] as const));
}

// ── Progress ─────────────────────────────────────────────────────────────

type ProgressUpdate = Partial<Pick<LessonProgress, "watchedAt" | "understanding" | "quizCorrect" | "quizTotal">>;

export async function updateProgress(lesson: Pick<Lesson, "id" | "courseId">, update: ProgressUpdate) {
  const db = await getDb();
  const set = { ...update, updatedAt: new Date() };
  await db
    .insert(schema.progress)
    .values({ lessonId: lesson.id, courseId: lesson.courseId, ...set })
    .onConflictDoUpdate({ target: schema.progress.lessonId, set });
}

/** Progress of every lesson in a course, keyed by node id. */
export async function getCourseProgress(course: Course, built: Map<string, Lesson>) {
  const db = await getDb();
  const rows = await db.query.progress.findMany({ where: eq(schema.progress.courseId, course.id) });
  const byLessonId = new Map(rows.map((row) => [row.lessonId, row]));
  return new Map(
    [...built.values()].flatMap((lesson) => {
      const row = byLessonId.get(lesson.id);
      return row ? [[lesson.nodeId, row] as const] : [];
    }),
  );
}
